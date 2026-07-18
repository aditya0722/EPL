import { z } from "zod";

export const updateProfileSchema = {
  body: z.object({
    fullName: z.string().min(2).optional(),
    mobileNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, { message: "Invalid mobile number" }).optional(),
    dob: z.string().transform((str) => new Date(str)).optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    panNumber: z.string().length(10).regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: "Invalid PAN format" }).optional(),
    aadhaarNumber: z.string().length(12).regex(/^\d+$/, { message: "Aadhaar must contain only 12 digits" }).optional(),
    address: z.string().min(5).optional(),
    state: z.string().min(2).optional(),
    district: z.string().min(2).optional(),
    pincode: z.string().regex(/^\d{6}$/, { message: "Pincode must be exactly 6 digits" }).optional(),
    occupation: z.string().min(2).optional(),
    monthlyIncome: z.number().positive().optional(),
    bankAccountNo: z.string().min(9).optional(),
    bankIfsc: z.string().min(11).optional(),
    bankName: z.string().min(2).optional(),
    upiId: z.string().min(3).optional(),
    emergencyContact: z.string().min(10).optional(),
    profilePhotoUrl: z.string().url().optional(),
  }),
};
