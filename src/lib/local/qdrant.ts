import { QdrantClient } from "@qdrant/js-client-rest";

export const COLLECTION_NAME = "resumes";

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
});

export async function ensureResumeCollection(vectorSize: number) {
  const collections = await qdrant.getCollections();

  const exists = collections.collections.some(
    (collection) => collection.name === COLLECTION_NAME
  );

  if (!exists) {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: vectorSize,
        distance: "Cosine",
      },
    });

    console.log(`Created Qdrant collection: ${COLLECTION_NAME}`);
  }
}