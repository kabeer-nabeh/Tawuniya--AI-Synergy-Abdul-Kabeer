import { HOLD_FIELDS,HOLD_GROUPS,HOLD_TEMPLATE,holdDownloadState } from './project-hold.js';

const xml=value=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const p=(text,style='Normal')=>`<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>${String(text).split('\n').map((line,i)=>`${i?'<w:r><w:br/></w:r>':''}<w:r><w:t xml:space="preserve">${xml(line)}</w:t></w:r>`).join('')}</w:p>`;

// Small dependency-free ZIP writer. DOCX is an Open Packaging Convention ZIP;
// store entries uncompressed so the browser does not need a compression service.
function zip(entries) {
 const encoder=new TextEncoder(),chunks=[],central=[];let offset=0;
 const u16=(a,n,v)=>new DataView(a.buffer).setUint16(n,v,true);
 const u32=(a,n,v)=>new DataView(a.buffer).setUint32(n,v>>>0,true);
 const crc32=bytes=>{let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;};
 for(const [path,content] of entries){
  const name=encoder.encode(path),data=encoder.encode(content),crc=crc32(data),header=new Uint8Array(30);
  u32(header,0,0x04034b50);u16(header,4,20);u16(header,6,0x800);u16(header,12,0x21);u32(header,14,crc);u32(header,18,data.length);u32(header,22,data.length);u16(header,26,name.length);
  const dir=new Uint8Array(46);u32(dir,0,0x02014b50);u16(dir,4,20);u16(dir,6,20);u16(dir,8,0x800);u16(dir,14,0x21);u32(dir,16,crc);u32(dir,20,data.length);u32(dir,24,data.length);u16(dir,28,name.length);u32(dir,42,offset);
  chunks.push(header,name,data);central.push(dir,name);offset+=header.length+name.length+data.length;
 }
 const centralSize=central.reduce((n,b)=>n+b.length,0),end=new Uint8Array(22);u32(end,0,0x06054b50);u16(end,8,entries.length);u16(end,10,entries.length);u32(end,12,centralSize);u32(end,16,offset);
 const all=[...chunks,...central,end],out=new Uint8Array(all.reduce((n,b)=>n+b.length,0));let cursor=0;for(const b of all){out.set(b,cursor);cursor+=b.length;}return out;
}

export function exportHoldDocument(document,{acknowledged=false,run=null,busy=false,workflowVersion=null}={}) {
 const policy=holdDownloadState(document,{run,busy,workflowVersion});
 if(!policy.allowed)throw new Error(`download-${policy.reason}`);
 if(policy.needsAcknowledgement&&!acknowledged)throw new Error('download-acknowledgement');
 const review=policy.review;
 let body=p('EPMO Project Hold','Title')+p(`Review draft | Revision ${review.revision} | Check ${review.run}`)+p(`Template: ${HOLD_TEMPLATE.version}. Internal demonstration, not an approved Tawuniya template.`);
 body+=p('Local field checks use a demo project snapshot. This document is not approved or submitted to Synergy. Blank fields and unverified approvals require human review.');
 for(const [group,en] of HOLD_GROUPS){
  body+=p(en,'Heading1');
  for(const [key,label,,,type] of HOLD_FIELDS.filter(f=>f[3]===group))body+=p(label,'Heading2')+p(review.fields[key]||'');
 }
 if(document.upload?.text)body+=p('Original extracted text (reference only)','Heading1')+p('Unchanged source text is retained below for reference. The corrected review fields above are the new draft. Source formatting, images, charts and signatures are not reproduced.')+p(document.upload.text);
 const declaration='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
 const entries=[
  ['[Content_Types].xml',`${declaration}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`],
  ['_rels/.rels',`${declaration}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`],
  ['word/_rels/document.xml.rels',`${declaration}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
  ['word/styles.xml',`${declaration}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Arial"/><w:sz w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="140"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="140"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/></w:rPr></w:style></w:styles>`],
  ['word/document.xml',`${declaration}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`]
 ];
 const slug=review.project.name[0].replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,70)||'project';
 return {bytes:zip(entries),filename:`Project-Hold-${slug}-revision-${review.revision}.docx`,mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
}
