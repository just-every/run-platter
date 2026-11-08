// Consent is bound to the revision and plan read through the member door.
export async function approvalRequestInput(h,input){
 const proposal=(await h.state()).proposals.find(p=>p.id===input.id)
 return {revision:proposal.revision,plan:proposal.approval.plan,...input}
}
