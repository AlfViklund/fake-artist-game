const { createClient } = require('@supabase/supabase-js');

const url = 'https://zwjqcmuzylsjskozpzkh.supabase.co';
const key = 'sb_publishable_p3ikxZoI_gyHgpsBxVkPEQ_ZMlEqDUR';

const client = createClient(url, key);

async function checkDb() {
  const rooms = await client.from('rooms').select('*');
  console.log('Rooms status:', rooms.status, rooms.data);

  const players = await client.from('room_players').select('*');
  console.log('Players status:', players.status, players.data);
}

checkDb();
