import { EventBusManager } from "@/utils/thread"
import { List, Map } from "immutable";

const bus = EventBusManager.getInstance('rizz-edit')
self.addEventListener('message', (e) => console.log(e.data))

const storeClips = () => {
  const clips = List([]);

  const handleAddClip = (file) => {

  }

  bus.on('addClip', handleAddClip);


}
