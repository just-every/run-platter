import type { MailSender } from '@runeditrun/rer/modules/operator-auth'
import type { Bindings } from './auth.server'
export function operatorMail(env: Bindings): MailSender | undefined
export function mailOff(env: Bindings): boolean
export type MailAttachment = {filename:string; contentType:string; content:Uint8Array; disposition:'attachment'}
export function mailboxMime(from:string,to:string,subject:string,text:string,replyTo?:string,attachments?:MailAttachment[]):string
