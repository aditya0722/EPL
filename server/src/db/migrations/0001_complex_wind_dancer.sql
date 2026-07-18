ALTER TABLE "repayments" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "repayment_type" varchar(20) DEFAULT 'emi' NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "interest_rate" numeric(5, 2) DEFAULT '12.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "interest_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "total_payable" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "repayments" ADD COLUMN "screenshot_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "state" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "district" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pincode" varchar(10);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bank_name" varchar(150);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "upi_id" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "emergency_contact" varchar(255);