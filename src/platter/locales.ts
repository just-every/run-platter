import eventTranslations from './locale-events'
import french from './locale-fr'
import german from './locale-de'
import portuguese from './locale-pt'
import { commit, exact, need, type Actor } from './model'
import { permitted } from './permissions'

export const clientLocales = ['en','es','fr','de','pt'] as const
export type ClientLocale = typeof clientLocales[number]
export type LocaleChoice = ClientLocale | 'auto'
export const localeNames: Record<ClientLocale,string> = {en:'English',es:'Spanish',fr:'French',de:'German',pt:'Portuguese'}
export const clientLocale = (row: any): ClientLocale => clientLocales.includes(row.client_locale) ? row.client_locale : 'en'
export function browserLocale(header: string | null): ClientLocale {
 const preferences=(header??'').split(',').map((part,index)=>{
  const [tag,...parameters]=part.trim().toLowerCase().split(';')
  const quality=parameters.find(p=>p.trim().startsWith('q='))?.trim().slice(2)
  return {locale:tag.split('-')[0],quality:quality===undefined?1:Number(quality),index}
 }).filter(p=>Number.isFinite(p.quality)&&p.quality>0&&p.quality<=1).sort((a,b)=>b.quality-a.quality||a.index-b.index)
 return preferences.find(p=>clientLocales.includes(p.locale as ClientLocale))?.locale as ClientLocale ?? 'en'
}
// Resolve once per invitation. Later requests cannot change the language retained
// with an acceptance merely by submitting a different request header.
export async function invitationLocale(db:D1Database,row:any,share:any,request:Request):Promise<ClientLocale> {
 const override=share.slot_id?await db.prepare('SELECT locale FROM p_recipient_locales WHERE proposal_id=? AND slot_id=?').bind(row.id,share.slot_id).first<{locale:string}>():null
 const choice=override?.locale??row.client_locale??'en'
 if(choice!=='auto')return clientLocale({client_locale:choice})
 const picked=browserLocale(request.headers.get('accept-language'))
 await db.prepare('INSERT INTO p_invitation_languages(token,locale) VALUES(?,?) ON CONFLICT DO NOTHING').bind(share.token,picked).run()
 return (await db.prepare('SELECT locale FROM p_invitation_languages WHERE token=?').bind(share.token).first<{locale:ClientLocale}>())!.locale
}
let rendering: ClientLocale = 'en'
export const renderingLocale = () => rendering
export function inClientLocale<T>(locale: ClientLocale, render: () => T): T {
 const previous = rendering
 rendering = locale
 try { return render() } finally { rendering = previous }
}

// Only source-owned literal segments enter this catalog. Interpolated firm text,
// names, titles, labels and prices are copied verbatim, even if they match a key.
export const spanish: Record<string, string> = {
 'Your proposal: ': 'Su propuesta: ',
 'Review your proposal and verify your email before accepting:': 'Revise su propuesta y verifique su correo electrónico antes de aceptarla:',
 'Your Platter verification code': 'Su código de verificación de Platter',
 'Your verification code is ': 'Su código de verificación es ',
 '. It expires in 10 minutes.': '. Caduca en 10 minutos.',
 'Proposal: ': 'Propuesta: ',
 'Client proposal': 'Propuesta para el cliente',
 'Skip to content': 'Ir al contenido',
 'Could not complete this action': 'No se pudo completar esta acción',
 'View privacy': 'Privacidad de las visitas',
 'Views of this page are measured. The firm records the invitation recipient, time, device class and approximate city, region and country. A link view is unverified until mailbox verification. No full IP address is stored. Engagement is retained for ': 'Se miden las visitas a esta página. La empresa registra el destinatario de la invitación, la hora, el tipo de dispositivo y la ciudad, región y país aproximados. La visita no está verificada hasta verificar el correo electrónico. No se almacena la dirección IP completa. Los datos de interacción se conservan durante ',
 ' days, unless held, and the firm can erase it.': ' días, salvo retención, y la empresa puede borrarlos.',
 'View measurement is off for this proposal. No third-party trackers are used.': 'La medición de visitas está desactivada para esta propuesta. No se utilizan rastreadores de terceros.',
 'Scope of work': 'Alcance del trabajo',
 'Offer options': 'Opciones de la oferta',
 'All prices are GST-free in AUD.': 'Todos los precios están exentos de GST y expresados en AUD.',
 'All prices are in USD. Package prices exclude tax; your selection includes sales tax.': 'Todos los precios están en USD. Los precios de los paquetes no incluyen impuestos; su selección incluye el impuesto sobre las ventas.',
 'All prices are in USD. Sales tax is not calculated.': 'Todos los precios están en USD. No se calcula el impuesto sobre las ventas.',
 'Package prices below exclude optional items. Your selection shows the final total and deposit.': 'Los precios de los paquetes no incluyen los artículos opcionales. Su selección muestra el total final y el anticipo.',
 'Deposit: ': 'Anticipo: ',
 'Deposit due: ': 'Anticipo pendiente: ',
 'Deposit ': 'Anticipo ',
 ' fixed deposit.': ' de anticipo fijo.',
 '% of the chosen option.': '% de la opción elegida.',
 'Terms': 'Condiciones',
 'No additional terms.': 'No hay condiciones adicionales.',
 'Proposal attachments': 'Archivos adjuntos de la propuesta',
 'Signed agreement package attachments': 'Archivos adjuntos del acuerdo firmado',
 'No attachments.': 'No hay archivos adjuntos.',
 'Offer expiry': 'Vencimiento de la oferta',
 'No expiry date.': 'Sin fecha de vencimiento.',
 'Expires at the start of ': 'Vence al comienzo del ',
 'Expires ': 'Vence ',
 ' calendar days after sending.': ' días naturales después del envío.',
 'This proposal has expired': 'Esta propuesta ha vencido',
 ' Acceptance is closed.': ' Ya no se puede aceptar.',
 'Verify your ': 'Verifique su ',
 'email': 'correo electrónico',
 ' below to ask the firm to reopen this offer.': ' a continuación para pedir a la empresa que reabra esta oferta.',
 'Your request to reopen this proposal has been saved. The firm can extend this offer or send you a revised one.': 'Se ha guardado su solicitud de reapertura. La empresa puede ampliar esta oferta o enviarle una revisión.',
 'Ask the firm to reopen this offer so you can accept it.': 'Pida a la empresa que reabra esta oferta para poder aceptarla.',
 'Request reopening': 'Solicitar reapertura',
 'Email reminders': 'Recordatorios por correo electrónico',
 'Email reminders are stopped for this revision. Your proposal decision is unchanged.': 'Los recordatorios están detenidos para esta revisión. Su decisión sobre la propuesta no cambia.',
 'You can stop reminder email for this revision without accepting or declining the proposal.': 'Puede detener los recordatorios de esta revisión sin aceptar ni rechazar la propuesta.',
 'Stop email reminders': 'Detener recordatorios',
 'Questions for the owner': 'Preguntas para el propietario',
 ' to ask about scope, pricing, or terms.': ' para preguntar sobre el alcance, los precios o las condiciones.',
 'Question about': 'Pregunta sobre',
 'Scope': 'Alcance',
 'Pricing': 'Precios',
 'Your question': 'Su pregunta',
 'Send question to owner': 'Enviar pregunta al propietario',
 'Agreement question history': 'Historial de preguntas del acuerdo',
 'Team answer': 'Respuesta del equipo',
 ' · Asked ': ' · Pregunta enviada el ',
 ' · Revision ': ' · Revisión ',
 'Text suggestions': 'Sugerencias de texto',
 'Suggestions never change your offer or prices. The firm reviews each edit and sends a newly approved revision.': 'Las sugerencias no cambian su oferta ni los precios. La empresa revisa cada cambio y envía una nueva revisión aprobada.',
 'Suggest an edit to ': 'Sugerir un cambio en ',
 'Existing text': 'Texto actual',
 'Suggested replacement': 'Texto propuesto',
 'Submit text suggestion': 'Enviar sugerencia',
 ' to suggest text edits.': ' para sugerir cambios de texto.',
 'Awaiting review': 'Pendiente de revisión',
 ' suggestion': ' — sugerencia',
 'Changes since your previous offer': 'Cambios desde su oferta anterior',
 'Revision ': 'Revisión ',
 ' compared with revision ': ' comparada con la revisión ',
 'Choose your package': 'Elija su paquete',
 'Review sections for': 'Revisar secciones de',
 'Review package': 'Revisar paquete',
 'Scope and terms above match this selection. Review them before accepting.': 'El alcance y las condiciones anteriores corresponden a esta selección. Revíselos antes de aceptar.',
 'Your selection': 'Su selección',
 'Selected total': 'Total seleccionado',
 'Selected deposit': 'Anticipo seleccionado',
 'Package: ': 'Paquete: ',
 'Total: ': 'Total: ',
 'Agreement downloads': 'Descargas del acuerdo',
 'Signed agreement PDF': 'Acuerdo firmado en PDF',
 'Certificate of completion': 'Certificado de finalización',
 'Proposal accepted': 'Propuesta aceptada',
 'This agreement is complete and cannot be changed.': 'Este acuerdo está completo y no se puede modificar.',
 'Accepted by': 'Aceptado por',
 'Chosen option': 'Opción elegida',
 'Deposit due': 'Anticipo pendiente',
 'Accepted at': 'Aceptado el',
 'Acceptance method': 'Método de aceptación',
 'Platter e-signature after ': 'Firma electrónica de Platter tras ',
 'mailbox verification': 'la verificación del correo electrónico',
 'This proposal has already been accepted. Its agreement cannot be changed.': 'Esta propuesta ya se ha aceptado. Su acuerdo no se puede modificar.',
 'Verify your email': 'Verifique su correo electrónico',
 'A verification code will be sent to ': 'Se enviará un código de verificación a ',
 '. Verify your email to accept this offer.': '. Verifique su correo electrónico para aceptar esta oferta.',
 'Send verification code': 'Enviar código de verificación',
 'Email verification code': 'Código de verificación por correo electrónico',
 'Verify email': 'Verificar correo electrónico',
 'Accept this proposal': 'Acepte esta propuesta',
 'Your ': 'Su ',
 ' is verified. Choose one option and confirm your acceptance below.': ' está verificado. Elija una opción y confirme su aceptación a continuación.',
 'Choose one option': 'Elija una opción',
 'Your full name': 'Su nombre completo',
 'I accept the scope of work, chosen option, total price, and deposit': 'Acepto el alcance del trabajo, la opción elegida, el precio total y el anticipo',
 ' and payment schedule': ' y el calendario de pagos',
 ' shown above.': ' indicados anteriormente.',
 'Acceptance is permanent. Check your chosen option before continuing.': 'La aceptación es permanente. Compruebe la opción elegida antes de continuar.',
 'Accept proposal': 'Aceptar propuesta',
 'Choose an option above to download the unsigned revision.': 'Elija una opción para descargar la revisión sin firmar.',
 'Download unsigned proposal PDF': 'Descargar propuesta sin firmar en PDF',
 'Decline this proposal': 'Rechace esta propuesta',
 'Declining closes this offer and revokes its client links. The firm can send a new revision for a fresh decision.': 'El rechazo cierra esta oferta y revoca sus enlaces de cliente. La empresa puede enviar una nueva revisión para otra decisión.',
 'Decline reason': 'Motivo del rechazo',
 'Decline proposal': 'Rechazar propuesta',
 'Proposal · Revision ': 'Propuesta · Revisión ',
 ' · accepted': ' · aceptada',
 'Verify the mailbox assigned to this personal invitation before viewing the proposal: ': 'Verifique el correo electrónico asignado a esta invitación personal antes de ver la propuesta: ',
 'Personal invitation': 'Invitación personal',
 'Wait one minute before requesting another code': 'Espere un minuto antes de solicitar otro código',
 'Code request limit reached. Contact the sender.': 'Se ha alcanzado el límite de solicitudes de código. Contacte con el remitente.',
 'Verification code queued for your email.': 'El código de verificación está preparado para enviarse a su correo electrónico.',
 'Enter the six-digit code': 'Introduzca el código de seis dígitos',
 'Code expired, was used, or reached its attempt limit. Request another code.': 'El código ha caducado, ya se ha utilizado o ha alcanzado el límite de intentos. Solicite otro código.',
 'Incorrect verification code': 'Código de verificación incorrecto',
 'Email verified. Choose your option and accept.': 'Correo electrónico verificado. Elija su opción y acepte.',
 'Verify your email before accepting': 'Verifique su correo electrónico antes de aceptar',
 'Confirm that you accept this proposal': 'Confirme que acepta esta propuesta',
 'Proposal accepted. Your agreed version is frozen.': 'Propuesta aceptada. La versión acordada queda fijada.',
 'This proposal has expired. Ask the firm to reopen it.': 'Esta propuesta ha vencido. Pida a la empresa que la reabra.',
 'The proposal or verification changed. Reload before continuing.': 'La propuesta o la verificación ha cambiado. Vuelva a cargar antes de continuar.',
 'Choose one offered option': 'Elija una de las opciones ofrecidas',
 'Verify your email before declining': 'Verifique su correo electrónico antes de rechazar',
 'Verify your email before opting out of reminders': 'Verifique su correo electrónico antes de detener los recordatorios',
 'This proposal is no longer open': 'Esta propuesta ya no está abierta',
 'This revision changed. Reload before declining.': 'Esta revisión ha cambiado. Vuelva a cargar antes de rechazar.',
 'Enter a decline reason (up to 1000 characters)': 'Introduzca un motivo del rechazo (hasta 1000 caracteres)',
 'Choose an offered option': 'Elija una de las opciones ofrecidas',
 'Choose a valid option': 'Elija una opción válida',
 'Enter your full name (up to 200 characters)': 'Introduzca su nombre completo (hasta 200 caracteres)',
 'Enter the six-digit code (up to 6 characters)': 'Introduzca el código de seis dígitos (hasta 6 caracteres)',
 'Email reminders are stopped for this proposal revision. This does not change the proposal or your decision.': 'Los recordatorios están detenidos para esta revisión. La propuesta y su decisión no cambian.',
 'I accept the selected option, scope and deposit.': 'Acepto la opción elegida, el alcance y el anticipo.',
 'I accept the selected option, scope, deposit and payment schedule.': 'Acepto la opción elegida, el alcance, el anticipo y el calendario de pagos.',
 'Subtotal before tax: ': 'Subtotal antes de impuestos: ',
 'Sales tax: ': 'Impuesto sobre las ventas: ',
 ' tax (': ' — impuesto (',
 'Tax address (': 'Dirección fiscal (',
 'One-off total: ': 'Total de pago único: ',
 'First-year value: ': 'Valor del primer año: ',
 ' · renewal date ': ' · fecha de renovación ',
 'state': 'estado',
 'county': 'condado',
 'city': 'ciudad',
 'district': 'distrito',
 'service': 'servicio',
 'billing': 'facturación',
 'week': 'semana',
 'month': 'mes',
 'quarter': 'trimestre',
 'year': 'año',
 'Deposit': 'Anticipo',
 'Acceptance': 'Aceptación',
 'Monthly retainer': 'Servicio mensual',
 'One-off balance': 'Saldo de pago único',
 'Yes': 'Sí',
 'No': 'No',
 'Proposal withdrawn': 'Propuesta retirada',
 'Contact the firm': 'Contacte con la empresa',
 'This proposal has been withdrawn. Contact ': 'Esta propuesta se ha retirado. Contacte con ',
 'Signer invitation replaced': 'Invitación de firma sustituida',
 'This signer invitation was replaced. Contact the firm for a current invitation.': 'Esta invitación de firma se ha sustituido. Contacte con la empresa para obtener una invitación actual.',
 'Received a forwarded link?': '¿Ha recibido un enlace reenviado?',
 'Identify yourself using your own mailbox. Your verified name and email will be shared with the proposal owner. This grants no signing authority.': 'Identifíquese con su propio correo electrónico. Su nombre y correo electrónico verificados se compartirán con el propietario de la propuesta. Esto no otorga permiso para firmar.',
 'Your stakeholder name': 'Su nombre como interesado',
 'Your stakeholder email': 'Su correo electrónico como interesado',
 'Send me a verification code and share my verified identity with the owner.': 'Envíenme un código de verificación y compartan mi identidad verificada con el propietario.',
 'Identify stakeholder': 'Identificar interesado',
 'Proposal document': 'Documento de la propuesta',
 'Firm logo': 'Logotipo de la empresa',
 'Fixed PDF pages': 'Páginas originales del PDF',
 ' original pages, followed by the appended blocks.': ' páginas originales, seguidas de los bloques añadidos.',
 'Open original PDF': 'Abrir PDF original',
 'Loading original PDF pages…': 'Cargando las páginas originales del PDF…',
 'Page break': 'Salto de página',
 'Assigned to the Client recipient': 'Asignado al destinatario Cliente',
 ' role': ' como rol',
 'Not collected': 'No recopilado',
 'Type your full name for ': 'Escriba su nombre completo para ',
 'By accepting below, you adopt this typed name as your signature for this block. It must match your acceptance name.': 'Al aceptar a continuación, adopta este nombre escrito como firma de este bloque. Debe coincidir con el nombre de aceptación.',
 'Download video': 'Descargar vídeo',
 ' content is disabled by the workspace administrator.': ' está desactivado por el administrador del espacio de trabajo.',
 'Loading this content connects to ': 'Al cargar este contenido se conecta con ',
 ', which receives your network address. Load only if you agree.': ', que recibirá su dirección de red. Cárguelo solo si está de acuerdo.',
 'Load external content': 'Cargar contenido externo',
 'Open external content': 'Abrir contenido externo',
 'Pricing table unavailable.': 'La tabla de precios no está disponible.',
 'Quantity': 'Cantidad',
 'Unit price': 'Precio unitario',
 'Unit': 'Unidad',
 'Group discount': 'Descuento del grupo',
 'Line discount': 'Descuento de la línea',
 'Group': 'Grupo',
 'Recurring terms': 'Condiciones recurrentes',
 'Term total': 'Total del plazo',
 'Line total': 'Total de la línea',
 'Table subtotal: ': 'Subtotal de la tabla: ',
 'Package grand total: ': 'Total del paquete: ',
 'Ungrouped': 'Sin grupo',
 ' subtotal': ' — subtotal',
 ' pricing': ' — precios',
 'Package discounts': 'Descuentos de los paquetes',
 'Package discount: ': 'Descuento del paquete: ',
 ' offer price expires on ': ' — el precio de la oferta vence el ',
 ' (UTC). After expiry, contact the firm for a new revision.': ' (UTC). Tras el vencimiento, contacte con la empresa para obtener una nueva revisión.',
 '% off ': '% de descuento sobre ',
 ' with a fixed reduction of ': ' con una reducción fija de ',
 '. The percentage applies to selected optional items; a fixed reduction applies once.': '. El porcentaje se aplica a los artículos opcionales seleccionados; la reducción fija se aplica una sola vez.',
 'Add ': 'Añadir ',
 ' each': ' por unidad',
 'Quantity for ': 'Cantidad para ',
 'Choose ': 'Elija de ',
 ' to ': ' a ',
 'Fixed quantity: ': 'Cantidad fija: ',
 ' installments from ': ' cuotas desde ',
 ' installments': ' cuotas',
 ' per ': ' por ',
 ' for ': ' durante ',
 ' once for ': ' una vez para ',
 '% and ': '% y ',
 'Payment schedule': 'Calendario de pagos',
 'Informational schedule. No automatic charges or invoices. Recurring pricing installments are included in the term total; any separately configured monthly retainer is additional.': 'Calendario informativo. No hay cargos ni facturas automáticos. Las cuotas recurrentes están incluidas en el total del plazo; cualquier servicio mensual configurado por separado es adicional.',
 'Net ': 'Plazo neto de ',
 ' terms: milestones and retainers are due ': ' días: los hitos y servicios periódicos vencen ',
 ' days after each listed date or event. The deposit is due at acceptance.': ' días después de cada fecha o evento indicado. El anticipo vence al aceptar.',
 ' (deposit credit ': ' (crédito del anticipo ',
 ' · net ': ' · plazo neto de ',
 'Verify your email to ask a question': 'Verifique su correo electrónico para hacer una pregunta',
 'Your question was sent to the owner.': 'Su pregunta se ha enviado al propietario.',
 'Question sent to the owner.': 'Pregunta enviada al propietario.',
 'Verify your email before suggesting edits': 'Verifique su correo electrónico antes de sugerir cambios',
 'This offer changed. Reload before suggesting.': 'Esta oferta ha cambiado. Vuelva a cargar antes de sugerir cambios.',
 'Suggest different text': 'Sugiera un texto diferente',
 'Select text that occurs exactly once in this section': 'Seleccione un texto que aparezca una sola vez en esta sección',
 'Suggestions are closed or the offer changed': 'Las sugerencias están cerradas o la oferta ha cambiado',
 'Suggestion recorded. The firm must review it; your offer is unchanged.': 'Sugerencia registrada. La empresa debe revisarla; su oferta no cambia.',
 'Enter the existing text (up to 10000 characters)': 'Introduzca el texto actual (hasta 10000 caracteres)',
 'Enter suggested text (up to 10000 characters)': 'Introduzca el texto propuesto (hasta 10000 caracteres)',
 'Verify your email to request reopening': 'Verifique su correo electrónico para solicitar la reapertura',
 'Your request to reopen this proposal has been saved.': 'Se ha guardado su solicitud de reapertura.',
 'An accepted agreement cannot be declined': 'No se puede rechazar un acuerdo ya aceptado',
 'The change could not be completed. Reload and try again.': 'No se pudo completar el cambio. Vuelva a cargar e inténtelo de nuevo.',
}
export const catalogs: Record<Exclude<ClientLocale,'en'>,Record<string,string>> = {es:spanish,fr:french,de:german,pt:portuguese}
const extras:Record<string,string[]> = {
 "Viewing as ": [
  "Vista como ",
  "Vous consultez en tant que ",
  "Ansicht als ",
  "Visualizando como "
 ],
 "This invitation is for viewing only. It grants no signing or payment authority.": [
  "Esta invitación es solo para consulta. No otorga permiso para firmar ni pagar.",
  "Cette invitation permet uniquement la consultation. Elle n’accorde aucun droit de signature ni de paiement.",
  "Diese Einladung dient nur zur Ansicht. Sie gewährt keine Unterschrifts- oder Zahlungsbefugnis.",
  "Este convite permite apenas a visualização. Não concede autorização para assinar nem pagar."
 ],
 "Your decision is retained. Waiting for the remaining recipients.": [
  "Su decisión está guardada. Se espera a los demás destinatarios.",
  "Votre décision est conservée. En attente des autres destinataires.",
  "Ihre Entscheidung ist gespeichert. Die übrigen Empfänger stehen noch aus.",
  "Sua decisão foi guardada. Aguardando os demais destinatários."
 ],
 "Waiting for the preceding signing group. You can review this proposal now.": [
  "Se espera al grupo de firma anterior. Ya puede revisar esta propuesta.",
  "En attente du groupe de signature précédent. Vous pouvez consulter cette proposition.",
  "Die vorherige Unterzeichnungsgruppe steht noch aus. Sie können dieses Angebot bereits prüfen.",
  "Aguardando o grupo de assinatura anterior. Você já pode revisar esta proposta."
 ],
 "I approve this exact proposal revision and selected package.": [
  "Apruebo esta revisión exacta de la propuesta y el paquete seleccionado.",
  "J’approuve cette version exacte de la proposition et le forfait sélectionné.",
  "Ich genehmige diese genaue Angebotsfassung und das ausgewählte Paket.",
  "Aprovo esta versão exata da proposta e o pacote selecionado."
 ],
 "Approve client revision": [
  "Aprobar revisión del cliente",
  "Approuver la version client",
  "Kundenfassung genehmigen",
  "Aprovar versão do cliente"
 ],
 "Your recipient role": [
  "Su rol de destinatario",
  "Votre rôle de destinataire",
  "Ihre Empfängerrolle",
  "Sua função de destinatário"
 ],
 "Mailbox verified. Review your recipient role below.": [
  "Correo electrónico verificado. Revise su rol a continuación.",
  "Adresse e-mail vérifiée. Consultez votre rôle ci-dessous.",
  "E-Mail-Adresse bestätigt. Prüfen Sie unten Ihre Empfängerrolle.",
  "E-mail verificado. Revise sua função abaixo."
 ],
 "Verify your own mailbox before signing": [
  "Verifique su propio correo electrónico antes de firmar",
  "Vérifiez votre propre adresse e-mail avant de signer",
  "Bestätigen Sie vor der Unterschrift Ihre eigene E-Mail-Adresse",
  "Verifique seu próprio e-mail antes de assinar"
 ],
 "Wait for the preceding signing group to finish": [
  "Espere a que termine el grupo de firma anterior",
  "Attendez la fin du groupe de signature précédent",
  "Warten Sie, bis die vorherige Unterzeichnungsgruppe fertig ist",
  "Aguarde o término do grupo de assinatura anterior"
 ],
 "Confirm your decision": [
  "Confirme su decisión",
  "Confirmez votre décision",
  "Bestätigen Sie Ihre Entscheidung",
  "Confirme sua decisão"
 ],
 "Your decision is already retained.": [
  "Su decisión ya está guardada.",
  "Votre décision est déjà conservée.",
  "Ihre Entscheidung ist bereits gespeichert.",
  "Sua decisão já foi guardada."
 ],
 "This agreement is already complete": [
  "Este acuerdo ya está completo",
  "Cet accord est déjà terminé",
  "Dieser Vertrag ist bereits abgeschlossen",
  "Este acordo já está concluído"
 ],
 "All recipients must sign the same package and quantities": [
  "Todos los destinatarios deben firmar el mismo paquete y las mismas cantidades",
  "Tous les destinataires doivent signer le même forfait et les mêmes quantités",
  "Alle Empfänger müssen dasselbe Paket und dieselben Mengen unterzeichnen",
  "Todos os destinatários devem assinar o mesmo pacote e as mesmas quantidades"
 ],
 "Proposal accepted. Every required signature is retained.": [
  "Propuesta aceptada. Se han guardado todas las firmas requeridas.",
  "Proposition acceptée. Toutes les signatures requises sont conservées.",
  "Angebot angenommen. Alle erforderlichen Unterschriften sind gespeichert.",
  "Proposta aceita. Todas as assinaturas obrigatórias foram guardadas."
 ],
 "Your approval is retained. Waiting for the remaining recipients.": [
  "Su aprobación está guardada. Se espera a los demás destinatarios.",
  "Votre approbation est conservée. En attente des autres destinataires.",
  "Ihre Genehmigung ist gespeichert. Die übrigen Empfänger stehen noch aus.",
  "Sua aprovação foi guardada. Aguardando os demais destinatários."
 ],
 "Your signature is retained. Waiting for the remaining recipients.": [
  "Su firma está guardada. Se espera a los demás destinatarios.",
  "Votre signature est conservée. En attente des autres destinataires.",
  "Ihre Unterschrift ist gespeichert. Die übrigen Empfänger stehen noch aus.",
  "Sua assinatura foi guardada. Aguardando os demais destinatários."
 ],
 "Open proposal in a new tab": [
  "Abrir propuesta en otra pestaña",
  "Ouvrir la proposition dans un nouvel onglet",
  "Angebot in einem neuen Tab öffnen",
  "Abrir proposta em outra aba"
 ],
 " if your browser blocks embedded verification.": [
  " si su navegador bloquea la verificación integrada.",
  " si votre navigateur bloque la vérification intégrée.",
  ", wenn Ihr Browser die eingebettete Bestätigung blockiert.",
  " se seu navegador bloquear a verificação incorporada."
 ],
 "Your request to reopen this proposal has been saved for the firm.": [
  "Se ha guardado su solicitud de reapertura para la empresa.",
  "Votre demande de réouverture a été enregistrée pour l’entreprise.",
  "Ihre Bitte um Wiederöffnung wurde für das Unternehmen gespeichert.",
  "Seu pedido de reabertura foi salvo para a empresa."
 ],
 "signer": [
  "firmante",
  "signataire",
  "Unterzeichner",
  "signatário"
 ],
 "countersigner": [
  "contrafirmante",
  "contresignataire",
  "Gegenzeichner",
  "contrassignatário"
 ],
 "approver": [
  "aprobador",
  "approbateur",
  "Genehmiger",
  "aprovador"
 ],
 "viewer": [
  "lector",
  "lecteur",
  "Betrachter",
  "visualizador"
 ],
 "cc": [
  "copia",
  "copie",
  "Kopie",
  "cópia"
 ]
}
for(const [key,values] of Object.entries(extras))for(const [i,locale] of (['es','fr','de','pt'] as const).entries())catalogs[locale][key]=values[i]
const electronicTranslations:Record<string,string[]> = {
 "You are reviewing this proposal electronically. Your consent applies only to this proposal, its signatures and completion records.": [
  "Revisa esta propuesta electrónicamente. Su consentimiento se aplica solo a esta propuesta, sus firmas y sus registros de finalización.",
  "Vous consultez cette proposition par voie électronique. Votre consentement concerne uniquement cette proposition, ses signatures et ses documents de réalisation.",
  "Sie prüfen dieses Angebot elektronisch. Ihre Einwilligung gilt nur für dieses Angebot, seine Unterschriften und Abschlussunterlagen.",
  "Você está revisando esta proposta eletronicamente. Seu consentimento se aplica apenas a esta proposta, suas assinaturas e seus registros de conclusão."
 ],
 "You need a current browser that supports secure connections and a PDF reader for PDF copies. You must be able to read this disclosure and save or print it before consenting.": [
  "Necesita un navegador actualizado que admita conexiones seguras y un lector de PDF para las copias en PDF. Debe poder leer esta información y guardarla o imprimirla antes de consentir.",
  "Vous devez disposer d’un navigateur à jour prenant en charge les connexions sécurisées et d’un lecteur PDF pour les copies PDF. Vous devez pouvoir lire ces informations et les enregistrer ou les imprimer avant de consentir.",
  "Sie benötigen einen aktuellen Browser mit sicheren Verbindungen und einen PDF-Reader für PDF-Kopien. Sie müssen diese Hinweise lesen und vor Ihrer Einwilligung speichern oder drucken können.",
  "Você precisa de um navegador atualizado que aceite conexões seguras e de um leitor de PDF para as cópias em PDF. Deve conseguir ler estas informações e salvá-las ou imprimi-las antes de consentir."
 ],
 "Use your browser to save or print this page. The signed agreement and certificate can be downloaded when completion requirements are met.": [
  "Use su navegador para guardar o imprimir esta página. El acuerdo firmado y el certificado se pueden descargar cuando se cumplan los requisitos de finalización.",
  "Utilisez votre navigateur pour enregistrer ou imprimer cette page. L’accord signé et le certificat sont téléchargeables lorsque les conditions de réalisation sont remplies.",
  "Speichern oder drucken Sie diese Seite mit Ihrem Browser. Der unterzeichnete Vertrag und das Zertifikat können heruntergeladen werden, sobald die Abschlussvoraussetzungen erfüllt sind.",
  "Use seu navegador para salvar ou imprimir esta página. O acordo assinado e o certificado podem ser baixados quando os requisitos de conclusão forem atendidos."
 ],
 "You may withdraw electronic-record consent before signing or ask the firm for a paper copy using the controls below. The firm receives your request for manual follow-up; no paper delivery, charge or new transaction happens automatically.": [
  "Puede retirar su consentimiento a los registros electrónicos antes de firmar o pedir una copia en papel mediante los controles siguientes. La empresa recibe su solicitud para atenderla manualmente; no se envía papel ni se realiza un cargo o una nueva transacción automáticamente.",
  "Vous pouvez retirer votre consentement aux documents électroniques avant de signer ou demander une copie papier avec les commandes ci-dessous. L’entreprise reçoit votre demande pour un suivi manuel ; aucun envoi papier, frais ni nouvelle opération n’est déclenché automatiquement.",
  "Sie können vor der Unterschrift Ihre Einwilligung in elektronische Unterlagen widerrufen oder mit den folgenden Schaltflächen eine Papierkopie anfordern. Das Unternehmen erhält Ihre Anfrage zur persönlichen Bearbeitung; es erfolgt kein automatischer Papierversand, keine Belastung und keine neue Transaktion.",
  "Você pode retirar seu consentimento a registros eletrônicos antes de assinar ou pedir uma cópia em papel pelos controles abaixo. A empresa recebe sua solicitação para acompanhamento manual; nenhuma entrega em papel, cobrança ou nova transação ocorre automaticamente."
 ],
 "Withdrawing pauses your electronic signing step without deleting the proposal or another person’s signature. You may give fresh consent here. To update your contact details or request records after signing, contact the firm.": [
  "La retirada pausa su paso de firma electrónica sin borrar la propuesta ni la firma de otra persona. Puede volver a consentir aquí. Para actualizar sus datos de contacto o pedir registros después de firmar, contacte con la empresa.",
  "Le retrait suspend votre étape de signature électronique sans supprimer la proposition ni la signature d’une autre personne. Vous pouvez donner un nouveau consentement ici. Pour modifier vos coordonnées ou demander des documents après signature, contactez l’entreprise.",
  "Der Widerruf pausiert Ihren elektronischen Unterschriftsschritt, ohne das Angebot oder die Unterschrift einer anderen Person zu löschen. Sie können hier erneut einwilligen. Für geänderte Kontaktdaten oder Unterlagen nach der Unterschrift wenden Sie sich an das Unternehmen.",
  "A retirada pausa sua etapa de assinatura eletrônica sem apagar a proposta nem a assinatura de outra pessoa. Você pode dar novo consentimento aqui. Para atualizar seus dados de contato ou pedir registros após assinar, contate a empresa."
 ],
 "I consent to electronic records and signatures for this proposal and confirm I can read and retain this disclosure. ": [
  "Consiento a los registros y firmas electrónicos de esta propuesta y confirmo que puedo leer y conservar esta información. ",
  "Je consens aux documents et signatures électroniques de cette proposition et confirme pouvoir lire et conserver ces informations. ",
  "Ich willige in elektronische Unterlagen und Unterschriften für dieses Angebot ein und bestätige, dass ich diese Hinweise lesen und aufbewahren kann. ",
  "Consinto com os registros e assinaturas eletrônicos desta proposta e confirmo que posso ler e guardar estas informações. "
 ],
 "Electronic records and signatures": [
  "Registros y firmas electrónicos",
  "Documents et signatures électroniques",
  "Elektronische Unterlagen und Unterschriften",
  "Registros e assinaturas eletrônicos"
 ],
 "Withdraw electronic consent": [
  "Retirar consentimiento electrónico",
  "Retirer le consentement électronique",
  "Elektronische Einwilligung widerrufen",
  "Retirar consentimento eletrônico"
 ],
 "Request paper copy": [
  "Solicitar copia en papel",
  "Demander une copie papier",
  "Papierkopie anfordern",
  "Pedir cópia em papel"
 ],
 "Consent electronically again": [
  "Volver a consentir electrónicamente",
  "Consentir de nouveau par voie électronique",
  "Erneut elektronisch einwilligen",
  "Consentir eletronicamente novamente"
 ],
 "Your electronic signing step is paused. The firm can see your request. Request paper or give fresh electronic consent to continue.": [
  "Su paso de firma electrónica está pausado. La empresa puede ver su solicitud. Pida papel o vuelva a consentir electrónicamente para continuar.",
  "Votre étape de signature électronique est suspendue. L’entreprise peut voir votre demande. Demandez du papier ou donnez un nouveau consentement électronique pour continuer.",
  "Ihr elektronischer Unterschriftsschritt ist pausiert. Das Unternehmen kann Ihre Anfrage sehen. Fordern Sie Papier an oder willigen Sie erneut elektronisch ein, um fortzufahren.",
  "Sua etapa de assinatura eletrônica está pausada. A empresa pode ver sua solicitação. Peça papel ou dê novo consentimento eletrônico para continuar."
 ],
 "Electronic consent withdrawn. The firm has your request. Your signing step is paused.": [
  "Consentimiento electrónico retirado. La empresa tiene su solicitud. Su paso de firma está pausado.",
  "Consentement électronique retiré. L’entreprise a reçu votre demande. Votre étape de signature est suspendue.",
  "Elektronische Einwilligung widerrufen. Das Unternehmen hat Ihre Anfrage. Ihr Unterschriftsschritt ist pausiert.",
  "Consentimento eletrônico retirado. A empresa recebeu sua solicitação. Sua etapa de assinatura está pausada."
 ],
 "Paper copy requested. The firm has your request. Your signing step is paused.": [
  "Copia en papel solicitada. La empresa tiene su solicitud. Su paso de firma está pausado.",
  "Copie papier demandée. L’entreprise a reçu votre demande. Votre étape de signature est suspendue.",
  "Papierkopie angefordert. Das Unternehmen hat Ihre Anfrage. Ihr Unterschriftsschritt ist pausiert.",
  "Cópia em papel solicitada. A empresa recebeu sua solicitação. Sua etapa de assinatura está pausada."
 ],
 "Fresh electronic consent recorded. You may review and sign.": [
  "Nuevo consentimiento electrónico registrado. Puede revisar y firmar.",
  "Nouveau consentement électronique enregistré. Vous pouvez consulter et signer.",
  "Neue elektronische Einwilligung gespeichert. Sie können das Angebot prüfen und unterschreiben.",
  "Novo consentimento eletrônico registrado. Você pode revisar e assinar."
 ],
 "Electronic consent is withdrawn. Request paper or give fresh electronic consent before signing.": [
  "Se ha retirado el consentimiento electrónico. Pida papel o vuelva a consentir electrónicamente antes de firmar.",
  "Le consentement électronique a été retiré. Demandez du papier ou donnez un nouveau consentement électronique avant de signer.",
  "Die elektronische Einwilligung wurde widerrufen. Fordern Sie Papier an oder willigen Sie vor der Unterschrift erneut elektronisch ein.",
  "O consentimento eletrônico foi retirado. Peça papel ou dê novo consentimento eletrônico antes de assinar."
 ]
}
for(const [key,values] of Object.entries(electronicTranslations))for(const [i,locale] of (['es','fr','de','pt'] as const).entries())catalogs[locale][key]=values[i]
const mailTranslations:Record<string,string[]> = {
 "Agreement complete: ": [
  "Acuerdo completo: ",
  "Accord terminé : ",
  "Vertrag abgeschlossen: ",
  "Acordo concluído: "
 ],
 "All required recipients have completed revision ": [
  "Todos los destinatarios requeridos han completado la revisión ",
  "Tous les destinataires requis ont terminé la version ",
  "Alle erforderlichen Empfänger haben die Fassung abgeschlossen: ",
  "Todos os destinatários obrigatórios concluíram a versão "
 ],
 ". Open your personal invitation to review the completed agreement.": [
  ". Abra su invitación personal para revisar el acuerdo completo.",
  ". Ouvrez votre invitation personnelle pour consulter l’accord terminé.",
  ". Öffnen Sie Ihre persönliche Einladung, um den abgeschlossenen Vertrag zu prüfen.",
  ". Abra seu convite pessoal para revisar o acordo concluído."
 ],
 "Proposal withdrawn: ": [
  "Propuesta retirada: ",
  "Proposition retirée : ",
  "Angebot zurückgezogen: ",
  "Proposta retirada: "
 ],
 "The firm has withdrawn this proposal.\nReason: ": [
  "La empresa ha retirado esta propuesta.\nMotivo: ",
  "L’entreprise a retiré cette proposition.\nMotif : ",
  "Das Unternehmen hat dieses Angebot zurückgezogen.\nGrund: ",
  "A empresa retirou esta proposta.\nMotivo: "
 ],
 "\nContact: ": [
  "\nContacto: ",
  "\nContact : ",
  "\nKontakt: ",
  "\nContato: "
 ],
 "Expiry warning: ": [
  "Aviso de vencimiento: ",
  "Avis d’expiration : ",
  "Ablaufwarnung: ",
  "Aviso de vencimento: "
 ],
 "This proposal expires at the start of ": [
  "Esta propuesta vence al comienzo del ",
  "Cette proposition expire au début du ",
  "Dieses Angebot läuft ab zu Beginn des ",
  "Esta proposta vence no início de "
 ],
 "). Verify your email to review and accept before that date.": [
  "). Verifique su correo electrónico para revisar y aceptar antes de esa fecha.",
  "). Vérifiez votre adresse e-mail pour consulter et accepter avant cette date.",
  "). Bestätigen Sie Ihre E-Mail-Adresse, um das Angebot vor diesem Datum zu prüfen und anzunehmen.",
  "). Verifique seu e-mail para revisar e aceitar antes dessa data."
 ],
 "This is a fixed automatic expiry warning. Shared editable email templates are not available.": [
  "Este es un aviso automático fijo de vencimiento. No hay plantillas de correo electrónico compartidas editables.",
  "Cet avis d’expiration automatique est fixe. Les modèles d’e-mail partagés modifiables ne sont pas disponibles.",
  "Dies ist eine feste automatische Ablaufwarnung. Bearbeitbare gemeinsame E-Mail-Vorlagen sind nicht verfügbar.",
  "Este é um aviso automático fixo de vencimento. Não há modelos compartilhados de e-mail editáveis."
 ],
 "To stop reminders, verify your mailbox on the proposal and opt out.": [
  "Para detener los recordatorios, verifique su correo electrónico en la propuesta y desactívelos.",
  "Pour arrêter les rappels, vérifiez votre adresse e-mail sur la proposition et désactivez-les.",
  "Um Erinnerungen zu stoppen, bestätigen Sie Ihre E-Mail-Adresse im Angebot und bestellen Sie sie ab.",
  "Para suspender os lembretes, verifique seu e-mail na proposta e desative-os."
 ],
 "Answer to your question: ": [
  "Respuesta a su pregunta: ",
  "Réponse à votre question : ",
  "Antwort auf Ihre Frage: ",
  "Resposta à sua pergunta: "
 ],
 "The firm answered your ": [
  "La empresa ha respondido a su pregunta sobre ",
  "L’entreprise a répondu à votre question sur ",
  "Das Unternehmen hat Ihre Frage beantwortet zu ",
  "A empresa respondeu à sua pergunta sobre "
 ],
 " question on revision ": [
  " en la revisión ",
  " dans la version ",
  " in Fassung ",
  " na versão "
 ],
 ".\n\nYour question:\n": [
  ".\n\nSu pregunta:\n",
  ".\n\nVotre question :\n",
  ".\n\nIhre Frage:\n",
  ".\n\nSua pergunta:\n"
 ],
 "\n\nAnswer:\n": [
  "\n\nRespuesta:\n",
  "\n\nRéponse :\n",
  "\n\nAntwort:\n",
  "\n\nResposta:\n"
 ]
}
for(const [key,values] of Object.entries(mailTranslations))for(const [i,locale] of (['es','fr','de','pt'] as const).entries())catalogs[locale][key]=values[i]
const paymentTranslations:Record<string,string[]> = {
 "Card": [
  "Tarjeta",
  "Carte",
  "Karte",
  "Cartão"
 ],
 "ACH bank debit": [
  "Débito bancario ACH",
  "Prélèvement bancaire ACH",
  "ACH-Lastschrift",
  "Débito bancário ACH"
 ],
 "Deposit payment": [
  "Pago del anticipo",
  "Paiement de l’acompte",
  "Anzahlung bezahlen",
  "Pagamento do sinal"
 ],
 "Your signature is retained immediately. Acceptance completes when Stripe confirms the deposit.": [
  "Su firma se guarda de inmediato. La aceptación se completa cuando Stripe confirma el anticipo.",
  "Votre signature est conservée immédiatement. L’acceptation se termine lorsque Stripe confirme l’acompte.",
  "Ihre Unterschrift wird sofort gespeichert. Die Annahme wird abgeschlossen, sobald Stripe die Anzahlung bestätigt.",
  "Sua assinatura é guardada imediatamente. A aceitação se conclui quando a Stripe confirma o sinal."
 ],
 "Signing completes acceptance. The deposit remains due until Stripe confirms payment.": [
  "La firma completa la aceptación. El anticipo queda pendiente hasta que Stripe confirme el pago.",
  "La signature termine l’acceptation. L’acompte reste dû jusqu’à la confirmation du paiement par Stripe.",
  "Die Unterschrift schließt die Annahme ab. Die Anzahlung bleibt fällig, bis Stripe die Zahlung bestätigt.",
  "A assinatura conclui a aceitação. O sinal permanece devido até a Stripe confirmar o pagamento."
 ],
 "Available methods: ": [
  "Métodos disponibles: ",
  "Moyens disponibles : ",
  "Verfügbare Methoden: ",
  "Métodos disponíveis: "
 ],
 "Deposit paid": [
  "Anticipo pagado",
  "Acompte payé",
  "Anzahlung bezahlt",
  "Sinal pago"
 ],
 "Deposit processing": [
  "Anticipo en proceso",
  "Acompte en cours de traitement",
  "Anzahlung wird verarbeitet",
  "Sinal em processamento"
 ],
 "Payment authentication required": [
  "Se requiere autenticar el pago",
  "Authentification du paiement requise",
  "Zahlungsbestätigung erforderlich",
  "Autenticação do pagamento necessária"
 ],
 "Deposit due — retry your payment": [
  "Anticipo pendiente — vuelva a intentar el pago",
  "Acompte dû — réessayez le paiement",
  "Anzahlung fällig — Zahlung erneut versuchen",
  "Sinal devido — tente pagar novamente"
 ],
 " received.": [
  " recibidos.",
  " reçus.",
  " eingegangen.",
  " recebidos."
 ],
 " due.": [
  " pendientes.",
  " dus.",
  " fällig.",
  " devidos."
 ],
 "Card fee": [
  "Recargo de tarjeta",
  "Frais de carte",
  "Kartengebühr",
  "Taxa do cartão"
 ],
 "Stripe is processing this deposit. Refresh the status to confirm its outcome.": [
  "Stripe está procesando este anticipo. Actualice el estado para confirmar el resultado.",
  "Stripe traite cet acompte. Actualisez l’état pour confirmer le résultat.",
  "Stripe verarbeitet diese Anzahlung. Aktualisieren Sie den Status, um das Ergebnis zu bestätigen.",
  "A Stripe está processando este sinal. Atualize o status para confirmar o resultado."
 ],
 "Contact the firm before attempting another payment.": [
  "Contacte con la empresa antes de intentar otro pago.",
  "Contactez l’entreprise avant de tenter un autre paiement.",
  "Kontaktieren Sie das Unternehmen, bevor Sie eine weitere Zahlung versuchen.",
  "Contate a empresa antes de tentar outro pagamento."
 ],
 "Refresh payment status": [
  "Actualizar estado del pago",
  "Actualiser l’état du paiement",
  "Zahlungsstatus aktualisieren",
  "Atualizar status do pagamento"
 ],
 "Payment method": [
  "Método de pago",
  "Moyen de paiement",
  "Zahlungsmethode",
  "Método de pagamento"
 ],
 "Billing state": [
  "Estado de facturación",
  "État de facturation",
  "Bundesstaat der Rechnungsadresse",
  "Estado de faturamento"
 ],
 "Two-letter state code": [
  "Código de estado de dos letras",
  "Code d’État à deux lettres",
  "Zweistelliges Bundesstaatkürzel",
  "Código do estado com duas letras"
 ],
 "Prepare my one-time deposit of ": [
  "Preparar mi anticipo único de ",
  "Préparer mon acompte unique de ",
  "Meine einmalige Anzahlung vorbereiten: ",
  "Preparar meu sinal único de "
 ],
 ". I will review the total and any card fee before paying. No future charges are authorized. Stripe collects payment details and any bank debit mandate.": [
  ". Revisaré el total y cualquier recargo de tarjeta antes de pagar. No se autorizan cargos futuros. Stripe recopila los datos de pago y cualquier mandato de débito bancario.",
  ". Je vérifierai le total et les éventuels frais de carte avant de payer. Aucun prélèvement futur n’est autorisé. Stripe recueille les informations de paiement et tout mandat de prélèvement bancaire.",
  ". Ich prüfe vor der Zahlung den Gesamtbetrag und mögliche Kartengebühren. Künftige Belastungen werden nicht genehmigt. Stripe erfasst Zahlungsdaten und gegebenenfalls das Lastschriftmandat.",
  ". Revisarei o total e qualquer taxa de cartão antes de pagar. Nenhuma cobrança futura é autorizada. A Stripe coleta os dados de pagamento e qualquer mandato de débito bancário."
 ],
 "Continue to secure payment": [
  "Continuar al pago seguro",
  "Continuer vers le paiement sécurisé",
  "Weiter zur sicheren Zahlung",
  "Continuar para o pagamento seguro"
 ],
 "Pay deposit": [
  "Pagar anticipo",
  "Payer l’acompte",
  "Anzahlung bezahlen",
  "Pagar sinal"
 ],
 "Agreement signed — waiting for payment": [
  "Acuerdo firmado — pago pendiente",
  "Accord signé — paiement en attente",
  "Vertrag unterzeichnet — Zahlung ausstehend",
  "Acordo assinado — aguardando pagamento"
 ],
 "Your signature is retained. Acceptance completes when the deposit succeeds.": [
  "Su firma está guardada. La aceptación se completa cuando el anticipo se paga correctamente.",
  "Votre signature est conservée. L’acceptation se termine lorsque le paiement de l’acompte réussit.",
  "Ihre Unterschrift ist gespeichert. Die Annahme wird abgeschlossen, wenn die Anzahlung erfolgreich ist.",
  "Sua assinatura foi guardada. A aceitação se conclui quando o sinal é pago com sucesso."
 ],
 "Signed by": [
  "Firmado por",
  "Signé par",
  "Unterzeichnet von",
  "Assinado por"
 ],
 "Agreed deposit": [
  "Anticipo acordado",
  "Acompte convenu",
  "Vereinbarte Anzahlung",
  "Sinal acordado"
 ],
 "Signed at": [
  "Firmado el",
  "Signé le",
  "Unterzeichnet am",
  "Assinado em"
 ],
 " · signed · payment pending": [
  " · firmado · pago pendiente",
  " · signé · paiement en attente",
  " · unterzeichnet · Zahlung ausstehend",
  " · assinado · pagamento pendente"
 ],
 "Secure payment could not load. Refresh the payment status before trying again.": [
  "No se pudo cargar el pago seguro. Actualice el estado del pago antes de intentarlo de nuevo.",
  "Le paiement sécurisé n’a pas pu être chargé. Actualisez l’état du paiement avant de réessayer.",
  "Die sichere Zahlung konnte nicht geladen werden. Aktualisieren Sie den Zahlungsstatus vor einem neuen Versuch.",
  "Não foi possível carregar o pagamento seguro. Atualize o status do pagamento antes de tentar novamente."
 ],
 "Payment could not be prepared.": [
  "No se pudo preparar el pago.",
  "Le paiement n’a pas pu être préparé.",
  "Die Zahlung konnte nicht vorbereitet werden.",
  "Não foi possível preparar o pagamento."
 ],
 "Secure payment is unavailable. Refresh the status or contact the firm.": [
  "El pago seguro no está disponible. Actualice el estado o contacte con la empresa.",
  "Le paiement sécurisé est indisponible. Actualisez l’état ou contactez l’entreprise.",
  "Die sichere Zahlung ist nicht verfügbar. Aktualisieren Sie den Status oder kontaktieren Sie das Unternehmen.",
  "O pagamento seguro está indisponível. Atualize o status ou contate a empresa."
 ],
 "Total payment": [
  "Pago total",
  "Paiement total",
  "Gesamtzahlung",
  "Pagamento total"
 ],
 "Pay ": [
  "Pagar ",
  "Payer ",
  "Bezahlen: ",
  "Pagar "
 ],
 " USD deposit": [
  " USD de anticipo",
  " USD d’acompte",
  " USD Anzahlung",
  " USD de sinal"
 ],
 "Review the exact payment total before paying.": [
  "Revise el total exacto del pago antes de pagar.",
  "Vérifiez le total exact avant de payer.",
  "Prüfen Sie vor der Zahlung den genauen Gesamtbetrag.",
  "Revise o total exato do pagamento antes de pagar."
 ],
 "Refresh payment status before trying again.": [
  "Actualice el estado del pago antes de intentarlo de nuevo.",
  "Actualisez l’état du paiement avant de réessayer.",
  "Aktualisieren Sie den Zahlungsstatus vor einem neuen Versuch.",
  "Atualize o status do pagamento antes de tentar novamente."
 ],
 "I authorize a one-time ": [
  "Autorizo la operación única de ",
  "J’autorise une opération unique de ",
  "Ich genehmige folgende einmalige ",
  "Autorizo a operação única de "
 ],
 "payment": [
  "pago",
  "paiement",
  "Zahlung",
  "pagamento"
 ],
 " of ": [
  " por un importe de ",
  " d’un montant de ",
  " über ",
  " no valor de "
 ],
 " for the deposit on “": [
  " para el anticipo de «",
  " pour l’acompte de «",
  " für die Anzahlung für „",
  " para o sinal de «"
 ],
 "”, revision ": [
  "», revisión ",
  "», version ",
  "“, Fassung ",
  "», versão "
 ],
 ". No future charges are authorized.": [
  ". No se autorizan cargos futuros.",
  ". Aucun prélèvement futur n’est autorisé.",
  ". Künftige Belastungen werden nicht genehmigt.",
  ". Nenhuma cobrança futura é autorizada."
 ],
 " Stripe verifies the bank account and records the ACH debit mandate.": [
  " Stripe verifica la cuenta bancaria y registra el mandato de débito ACH.",
  " Stripe vérifie le compte bancaire et enregistre le mandat de prélèvement ACH.",
  " Stripe bestätigt das Bankkonto und speichert das ACH-Lastschriftmandat.",
  " A Stripe verifica a conta bancária e registra o mandato de débito ACH."
 ],
 " Stripe collects payment details securely.": [
  " Stripe recopila los datos de pago de forma segura.",
  " Stripe recueille les informations de paiement de manière sécurisée.",
  " Stripe erfasst Zahlungsdaten sicher.",
  " A Stripe coleta os dados de pagamento com segurança."
 ],
 "Stripe could not prepare this payment. Contact the firm.": [
  "Stripe no pudo preparar este pago. Contacte con la empresa.",
  "Stripe n’a pas pu préparer ce paiement. Contactez l’entreprise.",
  "Stripe konnte diese Zahlung nicht vorbereiten. Kontaktieren Sie das Unternehmen.",
  "A Stripe não conseguiu preparar este pagamento. Contate a empresa."
 ],
 "Stripe could not confirm this payment. Refresh its status before trying again.": [
  "Stripe no pudo confirmar este pago. Actualice el estado antes de intentarlo de nuevo.",
  "Stripe n’a pas pu confirmer ce paiement. Actualisez son état avant de réessayer.",
  "Stripe konnte diese Zahlung nicht bestätigen. Aktualisieren Sie den Status vor einem neuen Versuch.",
  "A Stripe não conseguiu confirmar este pagamento. Atualize seu status antes de tentar novamente."
 ],
 "Verify your email before paying": [
  "Verifique su correo electrónico antes de pagar",
  "Vérifiez votre adresse e-mail avant de payer",
  "Bestätigen Sie Ihre E-Mail-Adresse vor der Zahlung",
  "Verifique seu e-mail antes de pagar"
 ],
 "Sign this current proposal before paying": [
  "Firme esta propuesta actual antes de pagar",
  "Signez cette proposition actuelle avant de payer",
  "Unterzeichnen Sie dieses aktuelle Angebot vor der Zahlung",
  "Assine esta proposta atual antes de pagar"
 ],
 "This agreement has no online deposit to collect": [
  "Este acuerdo no tiene un anticipo en línea pendiente",
  "Cet accord ne comporte aucun acompte à encaisser en ligne",
  "Für diesen Vertrag ist keine Online-Anzahlung fällig",
  "Este acordo não tem sinal on-line a receber"
 ],
 "This payment method is not offered": [
  "Este método de pago no se ofrece",
  "Ce moyen de paiement n’est pas proposé",
  "Diese Zahlungsmethode wird nicht angeboten",
  "Este método de pagamento não é oferecido"
 ],
 "The deposit or Stripe account changed. Contact the firm.": [
  "El anticipo o la cuenta de Stripe han cambiado. Contacte con la empresa.",
  "L’acompte ou le compte Stripe a changé. Contactez l’entreprise.",
  "Die Anzahlung oder das Stripe-Konto hat sich geändert. Kontaktieren Sie das Unternehmen.",
  "O sinal ou a conta Stripe mudou. Contate a empresa."
 ],
 "Billing state is frozen for this deposit. Contact the firm to change it.": [
  "El estado de facturación está fijado para este anticipo. Contacte con la empresa para cambiarlo.",
  "L’État de facturation est figé pour cet acompte. Contactez l’entreprise pour le modifier.",
  "Der Bundesstaat der Rechnungsadresse ist für diese Anzahlung festgelegt. Kontaktieren Sie das Unternehmen für eine Änderung.",
  "O estado de faturamento está fixado para este sinal. Contate a empresa para alterá-lo."
 ],
 "Start the deposit payment first": [
  "Inicie primero el pago del anticipo",
  "Commencez d’abord le paiement de l’acompte",
  "Starten Sie zunächst die Anzahlungszahlung",
  "Inicie primeiro o pagamento do sinal"
 ],
 "Confirm preparing this one-time deposit payment": [
  "Confirme la preparación de este pago único del anticipo",
  "Confirmez la préparation de ce paiement unique de l’acompte",
  "Bestätigen Sie die Vorbereitung dieser einmaligen Anzahlung",
  "Confirme a preparação deste pagamento único do sinal"
 ],
 "The firm must reconnect Stripe with its publishable key": [
  "La empresa debe volver a conectar Stripe con su clave publicable",
  "L’entreprise doit reconnecter Stripe avec sa clé publiable",
  "Das Unternehmen muss Stripe mit seinem öffentlichen Schlüssel neu verbinden",
  "A empresa deve reconectar a Stripe com sua chave publicável"
 ],
 "Online deposit collection currently requires USD": [
  "El cobro del anticipo en línea requiere USD",
  "L’encaissement d’acomptes en ligne nécessite des USD",
  "Online-Anzahlungen erfordern derzeit USD",
  "O recebimento de sinal on-line requer USD"
 ],
 "Payment preparation is already in progress. Refresh its status.": [
  "La preparación del pago ya está en curso. Actualice el estado.",
  "La préparation du paiement est déjà en cours. Actualisez son état.",
  "Die Zahlung wird bereits vorbereitet. Aktualisieren Sie den Status.",
  "A preparação do pagamento já está em andamento. Atualize seu status."
 ],
 "Stripe does not offer this payment method for the connected account": [
  "Stripe no ofrece este método de pago para la cuenta conectada",
  "Stripe ne propose pas ce moyen de paiement pour le compte connecté",
  "Stripe bietet diese Zahlungsmethode für das verbundene Konto nicht an",
  "A Stripe não oferece este método de pagamento para a conta conectada"
 ],
 "Stripe returned a different deposit": [
  "Stripe ha devuelto un anticipo diferente",
  "Stripe a renvoyé un acompte différent",
  "Stripe hat eine abweichende Anzahlung zurückgegeben",
  "A Stripe retornou um sinal diferente"
 ],
 "Payment preparation is held for reconciliation. Contact the firm.": [
  "La preparación del pago está retenida para su conciliación. Contacte con la empresa.",
  "La préparation du paiement est suspendue pour rapprochement. Contactez l’entreprise.",
  "Die Zahlungsvorbereitung wird zur Abstimmung zurückgehalten. Kontaktieren Sie das Unternehmen.",
  "A preparação do pagamento está retida para conciliação. Contate a empresa."
 ],
 "Stripe deposit binding changed. Contact the firm.": [
  "La vinculación del anticipo de Stripe ha cambiado. Contacte con la empresa.",
  "Le lien de l’acompte Stripe a changé. Contactez l’entreprise.",
  "Die Zuordnung der Stripe-Anzahlung hat sich geändert. Kontaktieren Sie das Unternehmen.",
  "A vinculação do sinal da Stripe mudou. Contate a empresa."
 ],
 "Stripe has not confirmed the deposit charge": [
  "Stripe no ha confirmado el cargo del anticipo",
  "Stripe n’a pas confirmé le prélèvement de l’acompte",
  "Stripe hat die Anzahlungsbelastung nicht bestätigt",
  "A Stripe não confirmou a cobrança do sinal"
 ],
 "Payment reconciliation requires an active owner": [
  "La conciliación del pago requiere un propietario activo",
  "Le rapprochement du paiement nécessite un propriétaire actif",
  "Die Zahlungsabstimmung erfordert einen aktiven Inhaber",
  "A conciliação do pagamento requer um proprietário ativo"
 ],
 "The Stripe account changed. Prepare the payment again with the firm.": [
  "La cuenta de Stripe ha cambiado. Prepare el pago de nuevo con la empresa.",
  "Le compte Stripe a changé. Préparez de nouveau le paiement avec l’entreprise.",
  "Das Stripe-Konto hat sich geändert. Bereiten Sie die Zahlung mit dem Unternehmen neu vor.",
  "A conta Stripe mudou. Prepare o pagamento novamente com a empresa."
 ],
 "Prepare this deposit before authorizing it": [
  "Prepare este anticipo antes de autorizarlo",
  "Préparez cet acompte avant de l’autoriser",
  "Bereiten Sie diese Anzahlung vor, bevor Sie sie genehmigen",
  "Prepare este sinal antes de autorizá-lo"
 ],
 "Review and authorize the exact payment total": [
  "Revise y autorice el total exacto del pago",
  "Vérifiez et autorisez le total exact du paiement",
  "Prüfen und genehmigen Sie den genauen Zahlungsbetrag",
  "Revise e autorize o total exato do pagamento"
 ],
 "Use a two-letter billing state": [
  "Use un estado de facturación de dos letras",
  "Utilisez un code d’État de facturation à deux lettres",
  "Verwenden Sie ein zweistelliges Bundesstaatkürzel",
  "Use um estado de faturamento com duas letras"
 ],
 "Your signature is retained. Complete the deposit payment below.": [
  "Su firma está guardada. Complete el pago del anticipo a continuación.",
  "Votre signature est conservée. Terminez le paiement de l’acompte ci-dessous.",
  "Ihre Unterschrift ist gespeichert. Schließen Sie unten die Anzahlung ab.",
  "Sua assinatura foi guardada. Conclua o pagamento do sinal abaixo."
 ],
 "Verify by text": [
  "Verificar por SMS",
  "Vérifier par SMS",
  "Per SMS bestätigen",
  "Verificar por SMS"
 ],
 "A verification code will be sent to the mobile number recorded with your consent. Texts respect your quiet hours. Reply STOP to stop or HELP for help.": [
  "Se enviará un código al número móvil registrado con su consentimiento. Los SMS respetan sus horas de descanso. Responda STOP para detenerlos o HELP para obtener ayuda.",
  "Un code sera envoyé au numéro de téléphone enregistré avec votre consentement. Les SMS respectent vos heures de tranquillité. Répondez STOP pour arrêter ou HELP pour obtenir de l’aide.",
  "Ein Code wird an die mit Ihrer Einwilligung gespeicherte Mobilnummer gesendet. SMS beachten Ihre Ruhezeiten. Antworten Sie STOP zum Beenden oder HELP für Hilfe.",
  "Um código será enviado ao número de celular registrado com seu consentimento. Os SMS respeitam seu horário de silêncio. Responda STOP para parar ou HELP para obter ajuda."
 ],
 "Text verification code": [
  "Código de verificación por SMS",
  "Code de vérification SMS",
  "SMS-Bestätigungscode",
  "Código de verificação por SMS"
 ],
 "Verify text code": [
  "Verificar código SMS",
  "Vérifier le code SMS",
  "SMS-Code bestätigen",
  "Verificar código SMS"
 ],
 "text code": [
  "código SMS",
  "code SMS",
  "SMS-Code",
  "código SMS"
 ],
 "Your Platter verification code is ": [
  "Su código de verificación de Platter es ",
  "Votre code de vérification Platter est ",
  "Ihr Platter-Bestätigungscode lautet ",
  "Seu código de verificação do Platter é "
 ],
 ". It expires in 10 minutes. Reply STOP to stop. HELP for help.": [
  ". Caduca en 10 minutos. Responda STOP para detener los SMS. HELP para obtener ayuda.",
  ". Il expire dans 10 minutes. Répondez STOP pour arrêter les SMS. HELP pour obtenir de l’aide.",
  ". Er läuft in 10 Minuten ab. Antworten Sie STOP zum Beenden. HELP für Hilfe.",
  ". Ele expira em 10 minutos. Responda STOP para parar os SMS. HELP para obter ajuda."
 ],
 "Verification code sent by text.": [
  "Código de verificación enviado por SMS.",
  "Code de vérification envoyé par SMS.",
  "Bestätigungscode per SMS gesendet.",
  "Código de verificação enviado por SMS."
 ],
 "Text code verified. Choose your option and accept.": [
  "Código SMS verificado. Elija su opción y acepte.",
  "Code SMS vérifié. Choisissez votre option et acceptez.",
  "SMS-Code bestätigt. Wählen Sie Ihre Variante und nehmen Sie das Angebot an.",
  "Código SMS verificado. Escolha sua opção e aceite."
 ],
 "Text verification waits until recipient quiet hours end": [
  "La verificación por SMS espera al final de las horas de descanso del destinatario",
  "La vérification SMS attend la fin des heures de tranquillité du destinataire",
  "Die SMS-Bestätigung wartet bis zum Ende der Ruhezeiten des Empfängers",
  "A verificação por SMS aguarda o fim do horário de silêncio do destinatário"
 ],
 "The text code outcome is uncertain. Wait before requesting a new code.": [
  "El resultado del código SMS es incierto. Espere antes de pedir otro código.",
  "Le résultat de l’envoi du code SMS est incertain. Attendez avant de demander un nouveau code.",
  "Das Ergebnis des SMS-Code-Versands ist ungewiss. Warten Sie, bevor Sie einen neuen Code anfordern.",
  "O resultado do código SMS é incerto. Aguarde antes de pedir um novo código."
 ],
 "This number has opted out of SMS": [
  "Este número ha rechazado los SMS",
  "Ce numéro a refusé les SMS",
  "Diese Nummer hat SMS abbestellt",
  "Este número recusou os SMS"
 ],
 "Record fresh SMS consent before sending": [
  "Registre un nuevo consentimiento para SMS antes del envío",
  "Enregistrez un nouveau consentement SMS avant l’envoi",
  "Erfassen Sie vor dem Versand eine neue SMS-Einwilligung",
  "Registre novo consentimento para SMS antes do envio"
 ],
 "SMS sender authority changed": [
  "La autorización del remitente SMS ha cambiado",
  "L’autorisation de l’expéditeur SMS a changé",
  "Die Berechtigung des SMS-Absenders hat sich geändert",
  "A autorização do remetente SMS mudou"
 ],
 "SMS invitation is no longer current": [
  "La invitación SMS ya no es actual",
  "L’invitation SMS n’est plus actuelle",
  "Die SMS-Einladung ist nicht mehr aktuell",
  "O convite SMS não é mais atual"
 ]
}
for(const [key,values] of Object.entries(paymentTranslations))for(const [i,locale] of (['es','fr','de','pt'] as const).entries())catalogs[locale][key]=values[i]
for(const [key,values] of Object.entries(eventTranslations))for(const [i,locale] of (['es','fr','de','pt'] as const).entries())catalogs[locale][key]=values[i]
const exactOnly = new Set(['email',' role','state','county','city','district','service','billing','week','month','quarter','year','Deposit','Acceptance','Monthly retainer','One-off balance','Yes','No','signer','countersigner','approver','viewer','cc'])
const keys = Object.keys(spanish).filter(key => !exactOnly.has(key)).sort((a,b) => b.length-a.length)
const matcher = new RegExp(keys.map(key => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g')
export function clientText(text: string, locale: ClientLocale): string {
 if(locale === 'en')return text
 const catalog=catalogs[locale]
 if(catalog[text])return catalog[text]
 // These errors contain a firm-authored field title. Preserve the captured title.
 const prefixes:Record<string,string[]>={
  'Complete required field: ':['Complete el campo obligatorio: ','Remplissez le champ obligatoire : ','Füllen Sie das Pflichtfeld aus: ','Preencha o campo obrigatório: '],
  'Enter text for ':['Introduzca texto para ','Saisissez le texte pour ','Geben Sie Text ein für ','Digite o texto para '],
  'Use up to 1000 characters for ':['Utilice hasta 1000 caracteres para ','Utilisez au plus 1 000 caractères pour ','Verwenden Sie bis zu 1000 Zeichen für ','Use até 1.000 caracteres para '],
  'Enter a valid calendar date for ':['Introduzca una fecha válida para ','Saisissez une date valide pour ','Geben Sie ein gültiges Datum ein für ','Digite uma data válida para '],
 }
 const index=['es','fr','de','pt'].indexOf(locale)
 for(const [prefix,translations] of Object.entries(prefixes))if(text.startsWith(prefix))return translations[index]+text.slice(prefix.length)
 const adopted=text.match(/^Adopt the same full name in (.*) as your acceptance name$/)
 if(adopted){const around=[['Adopte el mismo nombre completo en ',' que como nombre de aceptación'],['Utilisez le même nom complet dans ',' que pour votre acceptation'],['Übernehmen Sie denselben vollständigen Namen in ',' wie bei Ihrer Annahme'],['Adote o mesmo nome completo em ',' usado na aceitação']][index];return around[0]+adopted[1]+around[1]}
 return text
}
export function clientEnum(value:string):string {
 const names:Record<string,string>={scope:'Scope',pricing:'Pricing',terms:'Terms',weekly:'week',monthly:'month',quarterly:'quarter',annual:'year'}
 const states:Record<string,Record<string,string>>={es:{open:'Abierta',closed:'Cerrada',answered:'Respondida',accepted:'Aceptada',rejected:'Rechazada'},fr:{open:'Ouverte',closed:'Fermée',answered:'Répondue',accepted:'Acceptée',rejected:'Refusée'},de:{open:'Offen',closed:'Geschlossen',answered:'Beantwortet',accepted:'Angenommen',rejected:'Abgelehnt'},pt:{open:'Aberta',closed:'Fechada',answered:'Respondida',accepted:'Aceita',rejected:'Recusada'}}
 if(rendering==='en')return value
 return states[rendering]?.[value]??clientText(names[value]??value,rendering)
}
export function ui(text: string | TemplateStringsArray, ...values: unknown[]): string {
 const translate = (part: string) => {
  if(rendering === 'en')return part
  const catalog=catalogs[rendering]
  if(catalog[part])return catalog[part]
  const words = (value:string) => value.replace(matcher, match => catalog[match])
  // Translate text and accessible labels, keeping element names and structural
  // attributes intact. Interpolations are opaque until translation is complete.
  return part.split(/(<[^>]*(?:>|$))/g).map(piece => piece.startsWith('<')
   ? piece.replace(/(aria-label|title|placeholder)="([^"]*)"/g,(_,key,value)=>key+'="'+words(value)+'"')
   : words(piece)).join('')
 }
 if(typeof text === 'string')return translate(text)
 const source=text.reduce((result,part,i)=>result+part+(i<values.length?'\0'+i+'\0':''),'')
 return translate(source).replace(/\0(\d+)\0/g,(_,i)=>String(values[Number(i)]))
}
export async function saveClientLocale(db: D1Database, actor: Actor, input: Record<string, unknown>) {
 need(actor.role === 'owner', 'Only the owner chooses the client language', 403)
 const row = await permitted(db, actor, input.id, 'edit')
 exact(row, input)
 need(['draft','approved'].includes(row.status), 'Choose the client language before sending', 409)
 need(clientLocales.includes(input.locale as ClientLocale)||input.locale==='auto', 'Choose a supported client language')
 const slot=input.recipientId?String(input.recipientId):null
 if(slot)need((typeof row.recipient_plan==='string'?JSON.parse(row.recipient_plan):row.recipient_plan??[]).some((r:any)=>r.id===slot),'Choose a current recipient',404)
 const localeWrite=slot?db.prepare('INSERT INTO p_recipient_locales(proposal_id,slot_id,locale) VALUES(?,?,?) ON CONFLICT(proposal_id,slot_id) DO UPDATE SET locale=excluded.locale').bind(row.id,slot,input.locale):db.prepare('INSERT INTO p_client_locales(proposal_id,locale) VALUES(?,?) ON CONFLICT(proposal_id) DO UPDATE SET locale=excluded.locale').bind(row.id,input.locale)
 await commit(db, actor, [localeWrite,db.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(row.id)], false, {sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status IN ('draft','approved'))", values:[row.id,row.version]})
 return {id:row.id}
}

export async function recipientMailLocale(db:D1Database,id:string,slotId?:string|null,recipient?:string):Promise<ClientLocale>{
 const base=await db.prepare('SELECT locale FROM p_client_locales WHERE proposal_id=?').bind(id).first<{locale:string}>()
 const slot=slotId?await db.prepare('SELECT locale FROM p_recipient_locales WHERE proposal_id=? AND slot_id=?').bind(id,slotId).first<{locale:string}>():null
 const choice=slot?.locale??base?.locale??'en'
 if(choice!=='auto')return clientLocale({client_locale:choice})
 const shown=await db.prepare('SELECT l.locale FROM p_invitation_languages l JOIN p_shares s ON s.token=l.token WHERE s.proposal_id=? AND (? IS NULL OR s.slot_id=?) AND (? IS NULL OR s.recipient=? OR s.recipient IS NULL) ORDER BY s.rowid DESC LIMIT 1').bind(id,slotId??null,slotId??null,recipient??null,recipient??null).first<{locale:ClientLocale}>()
 return shown?.locale??'en'
}
export function retireInvitations(db:D1Database,id:string,slotId?:string){
 return db.prepare("INSERT INTO p_replaced_links(token,proposal_id,revision,client_locale) SELECT s.token,s.proposal_id,s.revision,CASE COALESCE(r.locale,l.locale,'en') WHEN 'auto' THEN COALESCE(i.locale,'en') ELSE COALESCE(r.locale,l.locale,'en') END FROM p_shares s LEFT JOIN p_recipient_locales r ON r.proposal_id=s.proposal_id AND r.slot_id=s.slot_id LEFT JOIN p_client_locales l ON l.proposal_id=s.proposal_id LEFT JOIN p_invitation_languages i ON i.token=s.token WHERE s.proposal_id=? AND (? IS NULL OR s.slot_id=?) ON CONFLICT(token) DO NOTHING").bind(id,slotId??null,slotId??null)
}

const clientScriptKeys = ["Secure payment could not load. Refresh the payment status before trying again.", "Payment could not be prepared.", "Secure payment is unavailable. Refresh the status or contact the firm.", "Deposit", "Card fee", "Total payment", "Pay ", " USD deposit", "Review the exact payment total before paying.", "Refresh payment status before trying again."]
export const clientScriptCopy = (locale:ClientLocale) => Object.fromEntries(clientScriptKeys.map(key=>[key,clientText(key,locale)]))
