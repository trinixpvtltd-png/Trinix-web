import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getAdminSession } from "@/server/auth/guards";

const f = createUploadthing();

export const uploadRouter = {
  ongoingPdf: f({ pdf: { maxFileSize: "16MB" } })
    .middleware(async () => {
      const session = await getAdminSession();
      if (!session) throw new Error("Unauthorized");
      return { userId: session.user?.id ?? "admin" };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      console.log("✅ File uploaded:", file.url);
      return { fileUrl: file.url, uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
