CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"actor_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar(100),
	"before" jsonb,
	"after" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_component" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"calc_method" varchar(20) NOT NULL,
	"default_value" numeric(12, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"kos_tenant_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"deposit_amount" numeric(12, 2) NOT NULL,
	"monthly_price" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gateway_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" varchar(20) NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"webhook_token_encrypted" text NOT NULL,
	"callback_token" varchar(100) NOT NULL,
	"settlement_account" varchar(100),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gateway_config_callback_token_unique" UNIQUE("callback_token")
);
--> statement-breakpoint
CREATE TABLE "payment_channel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"gateway_config_id" uuid NOT NULL,
	"channel_type" varchar(20) NOT NULL,
	"channel_code" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"mdr_percent" numeric(5, 2) DEFAULT '0',
	"fee_bearer" varchar(20) DEFAULT 'owner',
	"is_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"payment_link_token" varchar(100) NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"due_date" date NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_payment_link_token_unique" UNIQUE("payment_link_token")
);
--> statement-breakpoint
CREATE TABLE "invoice_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" varchar(255) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"component_type" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "maintenance_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"kos_tenant_id" uuid,
	"description" text NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meter_reading" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"reading_date" date NOT NULL,
	"electricity_value" numeric(10, 2),
	"water_value" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"channel_id" uuid,
	"payment_reference" varchar(255) NOT NULL,
	"external_payment_id" varchar(255),
	"channel_code" varchar(50) NOT NULL,
	"method" varchar(20) NOT NULL,
	"amount_paid" numeric(12, 2) NOT NULL,
	"admin_fee" numeric(12, 2) DEFAULT '0',
	"paid_at" timestamp,
	"expires_at" timestamp,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"proof_image_key" text,
	"raw_webhook" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_payment_reference_unique" UNIQUE("payment_reference")
);
--> statement-breakpoint
CREATE TABLE "property" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"city" varchar(100) NOT NULL,
	"timezone" varchar(50) DEFAULT 'Asia/Jakarta',
	"total_rooms" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kos_tenant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"ktp_number" varchar(16) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(255),
	"emergency_contact" text,
	"ktp_image_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"number" varchar(50) NOT NULL,
	"type" varchar(50) NOT NULL,
	"monthly_price" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'available' NOT NULL,
	"facilities" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan" varchar(20) NOT NULL,
	"amount_monthly" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'trialing' NOT NULL,
	"current_period_start" date NOT NULL,
	"current_period_end" date NOT NULL,
	"external_sub_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_saas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"subdomain" varchar(100),
	"custom_domain" varchar(255),
	"plan" varchar(20) DEFAULT 'starter' NOT NULL,
	"status" varchar(20) DEFAULT 'trial' NOT NULL,
	"owner_email" varchar(255) NOT NULL,
	"owner_phone" varchar(20),
	"logo_url" text,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"trial_ends_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_saas_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tenant_saas_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "user_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text,
	"role" varchar(20) DEFAULT 'staff' NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"mfa_enabled" boolean DEFAULT false,
	"mfa_secret" text,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_tenant_saas_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_saas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_component" ADD CONSTRAINT "billing_component_tenant_id_tenant_saas_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_saas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_component" ADD CONSTRAINT "billing_component_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract" ADD CONSTRAINT "contract_tenant_id_tenant_saas_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_saas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract" ADD CONSTRAINT "contract_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract" ADD CONSTRAINT "contract_kos_tenant_id_kos_tenant_id_fk" FOREIGN KEY ("kos_tenant_id") REFERENCES "public"."kos_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gateway_config" ADD CONSTRAINT "gateway_config_tenant_id_tenant_saas_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_saas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_channel" ADD CONSTRAINT "payment_channel_tenant_id_tenant_saas_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_saas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_channel" ADD CONSTRAINT "payment_channel_gateway_config_id_gateway_config_id_fk" FOREIGN KEY ("gateway_config_id") REFERENCES "public"."gateway_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_tenant_id_tenant_saas_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_saas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_contract_id_contract_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contract"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_tenant_id_tenant_saas_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_saas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_request" ADD CONSTRAINT "maintenance_request_tenant_id_tenant_saas_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_saas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_request" ADD CONSTRAINT "maintenance_request_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_request" ADD CONSTRAINT "maintenance_request_kos_tenant_id_kos_tenant_id_fk" FOREIGN KEY ("kos_tenant_id") REFERENCES "public"."kos_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_reading" ADD CONSTRAINT "meter_reading_tenant_id_tenant_saas_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_saas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_reading" ADD CONSTRAINT "meter_reading_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_tenant_id_tenant_saas_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_saas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_channel_id_payment_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."payment_channel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property" ADD CONSTRAINT "property_tenant_id_tenant_saas_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_saas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kos_tenant" ADD CONSTRAINT "kos_tenant_tenant_id_tenant_saas_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_saas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room" ADD CONSTRAINT "room_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room" ADD CONSTRAINT "room_tenant_id_tenant_saas_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_saas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_tenant_id_tenant_saas_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_saas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_account" ADD CONSTRAINT "user_account_tenant_id_tenant_saas_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_saas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_tenant_created" ON "audit_log" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_contract_tenant_status" ON "contract" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_gateway_callback_token" ON "gateway_config" USING btree ("callback_token");--> statement-breakpoint
CREATE INDEX "idx_invoice_tenant_status" ON "invoice" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_invoice_tenant_due" ON "invoice" USING btree ("tenant_id","due_date");--> statement-breakpoint
CREATE INDEX "idx_invoice_payment_token" ON "invoice" USING btree ("payment_link_token");--> statement-breakpoint
CREATE INDEX "idx_payment_tenant_status" ON "payment" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_payment_reference" ON "payment" USING btree ("payment_reference");--> statement-breakpoint
CREATE INDEX "idx_room_tenant_property" ON "room" USING btree ("tenant_id","property_id");--> statement-breakpoint
CREATE INDEX "idx_room_tenant_status" ON "room" USING btree ("tenant_id","status");