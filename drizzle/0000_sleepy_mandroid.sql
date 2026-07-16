CREATE TABLE `chess_rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`white_token` text NOT NULL,
	`black_token` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
