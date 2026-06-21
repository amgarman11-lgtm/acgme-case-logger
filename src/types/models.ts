// App-facing aliases for the generated Supabase types. Kept in a separate file
// so re-generating database.ts (after a migration) never clobbers them.
import type { Tables, TablesInsert, TablesUpdate, Enums } from './database'

export type CaseRow = Tables<'cases'>
export type CaseInsert = TablesInsert<'cases'>
export type CaseUpdate = TablesUpdate<'cases'>
export type UserSettingsRow = Tables<'user_settings'>
export type ResidentRole = Enums<'resident_role'>
