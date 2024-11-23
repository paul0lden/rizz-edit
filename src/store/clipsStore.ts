import { List } from "immutable";
import { FileStorage } from "./persist";
import { Clip } from "@/types";
import { MP4Demuxer } from "@/media/mp4_pull_demuxer";
import { BusEventCallback, EventBusManager } from "@/utils/thread";
import { ClipRenderer } from "@/media/lib/video_renderer";

const bus = EventBusManager.getInstance("rizz-edit");

function arrayBufferToBlob(
  arrayBuffer: ArrayBuffer,
  mimeType = "application/octet-stream"
) {
  const blob = new Blob([arrayBuffer], { type: mimeType });
  return blob
}

export const storeClips = () => {
  let clips = List<Clip>([]);
  const storage = new FileStorage();

  const initialize = async () => {
    try {
      await storage.init();
      const storedClips = await storage.getAllVideoClips();

      const clipsToAdd = await Promise.all(
        storedClips.map(async (storedClip): Promise<Clip> => {
          const demuxer = new MP4Demuxer(
            arrayBufferToBlob(storedClip.buffer)
          );
          await demuxer.initialize();
          const processor = new ClipRenderer(demuxer)
          await processor.initialize()

          return {
            ...storedClip,
            demuxer,
            processor,
          };
        })
      );

      clips = clips.push(...clipsToAdd);
    } catch (error) {
      console.error("Failed to initialize from storage:", error);
    }
  };

  const handleAddFiles: BusEventCallback<"addFiles"> = async ({ files }) => {
    const newClips = await Promise.all(
      files.map(async (file): Promise<Clip> => {
        const buffer = await file.arrayBuffer();
        const demuxer = new MP4Demuxer(file);
        const info = await demuxer.getVideoInfo();

        await demuxer.initialize();
        const processor = new ClipRenderer(demuxer)
        await processor.initialize()
        console.log(123)


        return {
          ...info,
          id: crypto.randomUUID(),
          demuxer,
          processor,
          buffer,
          name: file.name,
          startTime: 0,
          transform: {
            x: 0,
            y: 0,
            width: info.width,
            height: info.height,
            rotation: 0,
            scale: { x: 1, y: 1 },
          },
          effects: {
            brightness: 0,
            contrast: 1,
            saturation: 1,
          },
        };
      })
    );

    clips = clips.push(...newClips);

    bus.emit(
      "addClips",
      newClips.map((el) => ({
        effects: el.effects,
        startTime: el.startTime,
        id: el.id,
        duration: el.duration,
        name: el.name,
      }))
    );

    try {
      await storage.saveVideoClip(newClips);
    } catch (error) {
      console.error("Failed to persist clips:", error);
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
      console.error("Failed to remove clip from storage:", error);
      const removedClip = clips.get(index);
      if (removedClip) {
        clips = clips.insert(index, removedClip);
      }
    }
  };

  initialize();

  bus.on("addFiles", handleAddFiles);
  bus.on("removeClip", handleRemoveClip);
  bus.onRequest("getClips", async () => {
    console.log(clips.toArray());
    return clips.toArray().map((el) => ({
      effects: el.effects,
      startTime: el.startTime,
      id: el.id,
      duration: el.duration,
      name: el.name,
    }));
  });

  return {
    cleanup: () => {
      bus.off("addFiles", handleAddFiles);
      bus.off("removeClip", handleRemoveClip);
    },
    getClips: () => clips,
  };
};
