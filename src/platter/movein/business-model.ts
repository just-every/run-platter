import type { Json, SourceArtifact } from '../../modules/import-kit/src/types.ts'

export const businessNamespace = 'platter.business.csv.v1'
export const businessDestination = 'platter:business-records'
export const businessMappingVersion = 'business-csv-v1'
export type BusinessKind = 'companies' | 'contacts' | 'catalog'
export type BusinessRecord = { id: string; [key: string]: Json }
export type BusinessMapping = {
  delimiter: string
  columns: Record<string, string>
  companyIds: Record<string, string>
}
/** Only the server's acquisition helper supplies these bytes. URLs never claim custody. */
export type BusinessImage = {
  url: string
  mediaType: string
  artifact: SourceArtifact & { original: { status: 'available'; base64: string } }
}
export type BusinessImageInput = {
  allowUnfetched?: boolean
  images?: BusinessImage[]
  failures?: { url: string; message: string }[]
}
export type BusinessPayload = {
  value: BusinessRecord
  mappingHash: string
}
export type CsvRow = { cells: string[]; line: number }
