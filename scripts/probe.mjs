const UAS = { bot: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)", tw: "Twitterbot/1.0", chrome: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36" };
const metas = (h) => (h.match(/<meta[^>]+(?:property|name)="(?:og:|music:|twitter:title|description)[^>]*>/g) || []).join("\n");
for (const [k, ua] of Object.entries(UAS)) {
  const r = await fetch("https://open.spotify.com/track/5JLiNuE1B1mapzzJP2ikgd", { headers: { "user-agent": ua } });
  const h = await r.text();
  console.log(`== track as ${k}: ${r.status} len ${h.length}\n${metas(h).slice(0, 2500)}`);
  const alb = (h.match(/music:album"[^>]+content="[^"]*album\/([A-Za-z0-9]{22})/) || [])[1];
  if (alb) {
    const a = await (await fetch("https://open.spotify.com/album/" + alb, { headers: { "user-agent": ua } })).text();
    console.log(`== album ${alb} as ${k}\n${metas(a).slice(0, 1800)}`);
    const e = await (await fetch("https://open.spotify.com/embed/album/" + alb, { headers: { "user-agent": UAS.chrome } })).text();
    const ent = JSON.parse(e.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1]).props.pageProps.state.data.entity;
    console.log("== embed album", JSON.stringify({ keys: Object.keys(ent), name: ent.name, title: ent.title, subtitle: ent.subtitle, rel: ent.releaseDate, n: (ent.trackList || []).length, t0: ent.trackList?.[0], img: ent.visualIdentity?.image?.map((i) => i.maxWidth + ":" + i.url) }));
    break;
  }
}
for (const id of ["3hzOOUUxuOnt2guK0KpoYq", "2wP6Z8Ku76PxYV87OsfbTQ"]) {
  const h = await (await fetch("https://open.spotify.com/track/" + id, { headers: { "user-agent": UAS.bot } })).text();
  const alb = (h.match(/music:album"[^>]+content="[^"]*album\/([A-Za-z0-9]{22})/) || [])[1];
  const a = alb ? await (await fetch("https://open.spotify.com/album/" + alb, { headers: { "user-agent": UAS.bot } })).text() : "";
  console.log(`== ${id} album ${alb}\n${metas(a).slice(0, 700)}`);
}
