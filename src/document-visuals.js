// Inspect ZIP directory names only, without evaluating or rendering document content.
export function wordVisualSections(buffer) {
 const view=new DataView(buffer);let end=-1;
 for(let i=view.byteLength-22;i>=Math.max(0,view.byteLength-65557);i--)if(view.getUint32(i,true)===0x06054b50&&i+22+view.getUint16(i+20,true)===view.byteLength){end=i;break;}
 if(end<0)throw new Error('visual-directory-unavailable');
 const count=view.getUint16(end+10,true);let cursor=view.getUint32(end+16,true);
 if(count>5000)throw new Error('visual-directory-unavailable');
 const paths=[];
 for(let i=0;i<count;i++){
  if(cursor+46>view.byteLength||view.getUint32(cursor,true)!==0x02014b50)throw new Error('visual-directory-unavailable');
  const length=view.getUint16(cursor+28,true),extra=view.getUint16(cursor+30,true),comment=view.getUint16(cursor+32,true);
  if(cursor+46+length+extra+comment>view.byteLength)throw new Error('visual-directory-unavailable');
  paths.push(new TextDecoder().decode(new Uint8Array(buffer,cursor+46,length)));cursor+=46+length+extra+comment;
 }
 let image=0,chart=0;
 return paths.filter(path=>/^word\/(media\/[^/]+|charts\/chart\d+\.xml)$/.test(path)).map(path=>{
  const isChart=path.startsWith('word/charts/'),index=isChart?++chart:++image;
  return {kind:isChart?'chart':'image',location:isChart?[`Embedded chart ${index}`,`مخطط مضمن ${index}`]:[`Embedded image ${index}`,`صورة مضمنة ${index}`],description:['Inspect this embedded resource in the original document. Its exact section and visual content cannot be established from extracted text. A resource may also be a logo or unused media.','افحص المورد المضمن في المستند الأصلي. لا يحدد النص المستخرج قسمه الدقيق أو محتواه المرئي. قد يكون المورد شعارًا أو وسيطًا غير مستخدم.']};
 });
}

export function textVisualSections(text) {
 return [...text.matchAll(/^\[(image|chart):\s*([^\]\r\n]+)\]\s*$/gim)].slice(0,100).map(match=>({kind:match[1].toLowerCase(),location:[match[2].trim(),match[2].trim()],description:['Explicit visual placeholder in the text. Review the corresponding image or chart in the original document; no visual values were checked.','عنصر مرئي محدد صراحة في النص. راجع الصورة أو المخطط المقابل في المستند الأصلي؛ لم تُفحص القيم المرئية.']}));
}
