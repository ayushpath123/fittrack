import { confirmVoiceLogs } from "@/lib/voice/loggingAgent";
import { loadVoiceSearchContext } from "@/lib/voice/searchContext";
import { transcribeAudioWithGemini } from "@/lib/voice/transcribeAudio";
import { processVoiceTranscript } from "@/lib/voice/voiceAgent";
import type { VoiceConfirmResult } from "@/lib/voice/types";

export type VoicePipelineSuccess = {
  transcript: string;
  logged: VoiceConfirmResult["logged"];
  message: string;
  nutrition?: VoiceConfirmResult["nutrition"];
  hydrationMl?: VoiceConfirmResult["hydrationMl"];
};

export async function runVoicePipeline(
  apiKey: string,
  userId: string,
  audioBase64: string,
  mimeType: string,
  date?: string,
): Promise<VoicePipelineSuccess> {
  const [transcript, searchCtx] = await Promise.all([
    transcribeAudioWithGemini(apiKey, audioBase64, mimeType, userId),
    loadVoiceSearchContext(userId),
  ]);

  const trimmed = transcript.trim();
  if (!trimmed) {
    throw new Error("Couldn't hear anything — speak louder and try again.");
  }

  const processResult = await processVoiceTranscript(apiKey, userId, trimmed, searchCtx);
  const items = processResult.items;

  if (items.length === 0) {
    throw new Error(
      processResult.queryReply
        ? "That's a question — try the coach for queries."
        : "Nothing to log — name the food, workout, water, or weight clearly.",
    );
  }

  const confirmResult = await confirmVoiceLogs(
    userId,
    items.map((d) => ({ draftId: d.id, payload: d.payload })),
    date,
  );

  const labels = confirmResult.logged.filter((l) => l.success).map((l) => l.label);
  if (labels.length === 0) {
    const err = confirmResult.logged.find((l) => !l.success)?.error;
    throw new Error(err ?? "Could not save any logs.");
  }

  const message = labels.length === 1 ? `Logged ${labels[0]}` : `Logged ${labels.length} items`;

  return {
    transcript: trimmed,
    logged: confirmResult.logged,
    message,
    nutrition: confirmResult.nutrition,
    hydrationMl: confirmResult.hydrationMl,
  };
}
