import { z } from "zod";

export const verifyDocumentSchema = {
  body: z.object({
    status: z.enum(["approved", "rejected"]),
    remarks: z.string().optional(),
  }),
  params: z.object({
    id: z.string().uuid({ message: "Invalid document ID format" }),
  }),
};
