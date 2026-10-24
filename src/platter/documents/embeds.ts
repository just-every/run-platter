import { need } from '../model'

/** Exact provider paths only; query parameters and user info never reach a frame. */
export function embedUrl(value:unknown):string {
 need(typeof value==='string'&&value.length<=1000,'Enter an allowed HTTPS embed link')
 let url:URL
 try{url=new URL(value)}catch{need(false,'Enter an allowed HTTPS embed link')}
 need(url!.protocol==='https:'&&!url!.username&&!url!.password&&!url!.port,'Enter an allowed HTTPS embed link')
 const host=url!.hostname,path=url!.pathname
 if(['www.youtube.com','youtube.com','youtu.be','www.youtube-nocookie.com'].includes(host)){
  const id=host==='youtu.be'?path.slice(1):path==='/watch'?url!.searchParams.get('v'):path.match(/^\/embed\/([A-Za-z0-9_-]+)$/)?.[1]
  need(typeof id==='string'&&/^[A-Za-z0-9_-]{11}$/.test(id),'Choose a YouTube video link')
  return 'https://www.youtube-nocookie.com/embed/'+id
 }
 if(['vimeo.com','player.vimeo.com'].includes(host)){
  const id=path.match(/^\/(?:video\/)?(\d{1,15})$/)?.[1];need(id,'Choose a Vimeo video link');return 'https://player.vimeo.com/video/'+id
 }
 if(['www.loom.com','loom.com'].includes(host)){
  const id=path.match(/^\/(?:share|embed)\/([a-f0-9]{32})$/i)?.[1];need(id,'Choose a Loom video link');return 'https://www.loom.com/embed/'+id
 }
 if(['fast.wistia.net','fast.wistia.com'].includes(host)){
  const id=path.match(/^\/embed\/iframe\/([a-z0-9]{10})$/)?.[1];need(id,'Choose a Wistia embed link');return 'https://fast.wistia.net/embed/iframe/'+id
 }
 if(host==='calendly.com'&&/^\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/?$/.test(path))return 'https://calendly.com'+path.replace(/\/$/,'')
 need(false,'This embed host or path is not allowed. Use YouTube, Vimeo, Loom, Wistia or Calendly.')
}
export const embedFrameSources="https://www.youtube-nocookie.com https://player.vimeo.com https://www.loom.com https://fast.wistia.net https://calendly.com"
