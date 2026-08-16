import { randomUUID } from "crypto";
import { embeddings } from "../local/ollama";
import {
  qdrant,
  COLLECTION_NAME,
  ensureResumeCollection,
} from "./qdrant";

export async function indexResume(
  chunks: any[],
  filename: string,
  jobId: string
) {
  const texts = chunks.map((chunk) => chunk.pageContent);

  const vectors = await embeddings.embedDocuments(texts);

  console.log(`Generated ${vectors.length} embeddings`);
  console.log(`Vector dimension: ${vectors[0].length}`);

  await ensureResumeCollection(vectors[0].length);

  const points = vectors.map((vector, index) => ({
    id: randomUUID(),
    vector,
    payload: {
      filename,
      text: chunks[index].pageContent,
      source: chunks[index].metadata?.source,
      page: chunks[index].metadata?.loc?.pageNumber,
      jobId,
      chunkIndex: index,
    },
  }));

  const result = await qdrant.upsert(COLLECTION_NAME, {
    wait: true,
    points,
  });

  console.log("Qdrant upsert:", result);

  return {
    vectors: vectors.length,
    result,
  };
}