const {test}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {io}=require('socket.io-client');
const {createPokerServer}=require('./index');

test('room membership, host authority, validation, identity, transfer and cleanup',async()=>{
  const relay=createPokerServer();
  relay.server.listen(0,'127.0.0.1');
  await once(relay.server,'listening');
  const address=`http://127.0.0.1:${relay.server.address().port}`;
  const clients=[];
  async function client(){const socket=io(address,{transports:['websocket'],reconnection:false});clients.push(socket);await once(socket,'connect');return socket;}
  const send=(socket,event,payload)=>socket.timeout(2000).emitWithAck(event,payload);
  try {
    const host=await client(), guest=await client(), outsider=await client();
    assert.equal((await send(host,'room:create',null)).ok,false);
    assert.equal((await send(host,'room:create',{playerName:''})).ok,false);
    const created=await send(host,'room:create',{playerName:'Host'});
    assert.equal(created.ok,true);
    const roomCode=created.snapshot.roomCode;
    const settings={startingChips:1000,bigBlind:20,smallBlind:10,playerNames:['One','Two'],decisionTimerSeconds:0,blindIncreaseInterval:0,blindIncreaseAmount:0};
    const game={id:'game',players:['One','Two'].map((name,index)=>({id:String(index),name,chips:1000,currentBet:0,totalContribution:0,isFolded:false,isAllIn:false,isDealer:index===0,isActive:true,isTurn:false})),pot:0,sidePots:[],currentBet:0,minimumBet:20,bigBlind:20,smallBlind:10,dealerIndex:0,smallBlindIndex:0,bigBlindIndex:1,currentPlayerIndex:0,round:'pre-flop',roundNumber:0,isHandActive:false,lastRaiseAmount:20,playersActedThisRound:[]};
    const state={roomCode,game,settings,history:[]};
    assert.equal((await send(outsider,'state:push',state)).ok,false);
    assert.equal((await send(outsider,'chat:send',{roomCode,text:'intrusion'})).ok,false);
    assert.equal((await send(guest,'room:join',{roomCode,playerName:'Guest'})).ok,true);
    assert.equal((await send(guest,'state:push',state)).ok,false);
    assert.equal((await send(guest,'timer:pause',{roomCode,paused:true})).ok,false);
    assert.equal((await send(host,'state:push',{...state,game:{players:[]}})).ok,false);
    assert.equal((await send(host,'state:push',{...state,settings:{...settings,bigBlind:-1}})).ok,false);
    assert.equal((await send(host,'state:push',state)).ok,true);
    assert.equal((await send(host,'timer:pause',{roomCode,paused:true})).ok,true);
    const chatUpdate=once(host,'chat:update');
    assert.equal((await send(guest,'chat:send',{roomCode,sender:'Host',text:'Hello'})).ok,true);
    const [chat]=await chatUpdate;
    assert.equal(chat.chat[0].sender,'Guest');
    assert.equal((await send(guest,'chat:send',{roomCode,text:'x'.repeat(501)})).ok,false);
    const transfer=once(guest,'room:update');
    host.disconnect();
    const [next]=await transfer;
    assert.equal(next.hostSocketId,guest.id);
    assert.equal((await send(guest,'state:push',state)).ok,true);
    // Creating a new room must leave the old room and release its memory.
    assert.equal((await send(guest,'room:create',{playerName:'New host'})).ok,true);
    assert.equal(relay.rooms.has(roomCode),false);
    assert.equal(relay.rooms.size,1);
  } finally {
    clients.forEach(socket=>socket.disconnect());
    await new Promise(resolve=>relay.io.close(resolve));
  }
});

test('unexpected browser origins are rejected',async()=>{
  const relay=createPokerServer({allowedOrigins:'https://example.com'});
  relay.server.listen(0,'127.0.0.1');await once(relay.server,'listening');
  const client=io(`http://127.0.0.1:${relay.server.address().port}`,{transports:['websocket'],reconnection:false,extraHeaders:{Origin:'https://untrusted.example'}});
  try { await once(client,'connect_error'); assert.equal(client.connected,false); }
  finally {client.disconnect();await new Promise(resolve=>relay.io.close(resolve));}
});
