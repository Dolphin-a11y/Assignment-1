import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const chessRooms = sqliteTable("chess_rooms", {
  code: text("code").primaryKey(),
  state: text("state").notNull(),
  whiteToken: text("white_token").notNull(),
  blackToken: text("black_token"),
  version: integer("version").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
