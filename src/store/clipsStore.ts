import { List, Map } from "immutable";
import { FileStorage } from "./persist";
import { VideoClip } from "@/types";
import { MP4Demuxer } from "@/media/mp4_pull_demuxer";
import { BusEventCallback, EventBusManager } from "@/utils/thread";

const bus = EventBusManager.getInstance("rizz-edit");

export const storeClips = () => {
  let clips = List<VideoClip>([]);
  const storage = new FileStorage();

  // Initialize by loading existing clips from storage
  const initialize = async () => {
    try {
      await storage.init();
      const storedClips = await storage.getAllVideoClips();

      clips = List(storedClips.map(storedClip => {
        const file = new File([storedClip.blob], storedClip.fileName, {
          lastModified: storedClip.lastModified
        });
        const demuxer = new MP4Demuxer(file);
        demuxer.initialize();

        return {
          id: storedClip.id,
          demuxer,
          file,
          fileName: storedClip.fileName,
          startTime: storedClip.startTime,
          transform: storedClip.transform,
          effects: storedClip.effects,
        };
      }));
    } catch (error) {
      console.error('Failed to initialize from storage:', error);
    }
  };

  const handleAddClip: BusEventCallback<"addClip"> = async ({ files, id }) => {
    const newClips = files.map(async (file) => {
      const demuxer = new MP4Demuxer(file);

      const info = await demuxer.getFileInfo()
      console.log(info)

      demuxer.initialize();
      return {
        id,
        demuxer,
        file,
        fileName: file.name,
        startTime: 0,
        transform: {
          translation: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        effects: {
          brightness: 0,
          contrast: 1,
          saturation: 1,
        },
      };
    });

    clips = clips.push(...newClips);

    console.log(newClips)
    try {
      await storage.saveVideoClip(newClips);
    } catch (error) {
      console.error('Failed to persist clips:', error);
      clips = clips.splice(-newClips.length, 1);
    }
  };

  const handleRemoveClip: BusEventCallback<"removeClip"> = async ({ id }) => {
    const index = clips.findIndex((el) => el.id === id);
    if (index === -1) return;

    clips = clips.remove(index);

    try {
      await storage.deleteVideoClip(id);
    } catch (error) {
      console.error('Failed to remove clip from storage:', error);
      const removedClip = clips.get(index);
      if (removedClip) {
        clips = clips.insert(index, removedClip);
      }
    }
  };

  initialize();

  bus.on("addClip", handleAddClip);
  bus.on("removeClip", handleRemoveClip);
  bus.onRequest("getClips", async () => clips.toArray());

  return () => {
    bus.off("addClip", handleAddClip);
    bus.off("removeClip", handleRemoveClip);
  };
};
