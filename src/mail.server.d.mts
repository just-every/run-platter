import type { MailSender } from '@runeditrun/rer/modules/operator-auth'
import type { Bindings } from './auth.server'
export function operatorMail(env: Bindings): MailSender | undefined
