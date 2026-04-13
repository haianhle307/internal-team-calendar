CREATE TABLE "days_off" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "days_off_range_ok" CHECK ("days_off"."end_date" >= "days_off"."start_date")
);
--> statement-breakpoint
CREATE INDEX "days_off_start_idx" ON "days_off" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "days_off_end_idx" ON "days_off" USING btree ("end_date");