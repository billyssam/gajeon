// 충돌 때 전체 옛 문서를 덮지 않고 이번 실행이 바꾼 필드만 최신 문서에 적용한다.
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
export function mergeChanges(base, next, fresh) {
  if(equal(base,next)) return structuredClone(fresh);
  if(Array.isArray(base) && Array.isArray(next) && Array.isArray(fresh) && [...base,...next,...fresh].every(x=>x && x.id)){
    const b=new Map(base.map(x=>[x.id,x])), n=new Map(next.map(x=>[x.id,x]));
    const rows=fresh.filter(x=>!(b.has(x.id)&&!n.has(x.id))).map(x=> n.has(x.id) ? mergeChanges(b.get(x.id),n.get(x.id),x) : x);
    for(const x of next) if(!rows.some(r=>r.id===x.id)) rows.push(x);
    return rows;
  }
  if(base && next && fresh && !Array.isArray(next) && typeof next==='object' && typeof base==='object' && typeof fresh==='object'){
    const result=structuredClone(fresh);
    for(const k of new Set([...Object.keys(base),...Object.keys(next)])){
      if(equal(base[k],next[k])) continue;
      if(!(k in next)) delete result[k];
      else result[k]=mergeChanges(base[k],next[k],fresh[k]);
    }
    return result;
  }
  return structuredClone(next);
}
