import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export async function loadResume(filePath: string) {
  const loader = new PDFLoader(filePath);

  const docs = await loader.load();

  console.log(`Loaded ${docs.length} pages`);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 150,
  });

  const chunks = await splitter.splitDocuments(docs);

  console.log(`Created ${chunks.length} chunks`);

  return {
    docs,
    chunks,
  };
}