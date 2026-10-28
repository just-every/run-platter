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
 if(input.locale !== 'en') {
  need(!await db.prepare('SELECT 1 FROM p_collection_policy WHERE proposal_id=?').bind(row.id).first(), 'Turn off collection before choosing a translated client language', 409)
 }
 const slot=input.recipientId?String(input.recipientId):null
 if(slot)need((typeof row.recipient_plan==='string'?JSON.parse(row.recipient_plan):row.recipient_plan??[]).some((r:any)=>r.id===slot),'Choose a current recipient',404)
 const localeWrite=slot?db.prepare('INSERT INTO p_recipient_locales(proposal_id,slot_id,locale) VALUES(?,?,?) ON CONFLICT(proposal_id,slot_id) DO UPDATE SET locale=excluded.locale').bind(row.id,slot,input.locale):db.prepare('INSERT INTO p_client_locales(proposal_id,locale) VALUES(?,?) ON CONFLICT(proposal_id) DO UPDATE SET locale=excluded.locale').bind(row.id,input.locale)
 await commit(db, actor, [localeWrite,db.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(row.id)], false, {sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status IN ('draft','approved'))", values:[row.id,row.version]})
 return {id:row.id}
}
