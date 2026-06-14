/* Mining pose + alignment guards: during a mining extraction the player faces
   south, the equipped weapon is hidden (the pickaxe is baked into the sheet),
   and the target ore vein is reparented ABOVE the player so it hides the
   animation's baked rock. */
import { chromium } from 'playwright-core';
const EXE='/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
const browser=await chromium.launch({executablePath:EXE,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--mute-audio']});
const ctx=await browser.newContext({viewport:{width:480,height:900},hasTouch:true});
const page=await ctx.newPage();
const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
await page.addInitScript(`window.BROTOWN_WS_URL='ws://127.0.0.1:8787'`);
await page.goto('http://localhost:4173/?noresume=1',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForTimeout(9000);
await page.locator('input').first().fill('MineQA');await page.locator('input').first().press('Enter');
await page.waitForFunction(()=>{const S=window._gameState&&window._gameState.current;return S&&S.player&&S.currentZone&&!document.body.innerText.includes('LOADING');},{timeout:45000}).catch(()=>{});
await page.waitForTimeout(2500); await page.touchscreen.tap(240,300); await page.waitForTimeout(1000);
await page.evaluate(()=>{
  const S=window._gameState.current;const P=S.player;
  const node={id:'qa-ore',x:P.x,y:P.y,alive:true,nodeType:'oreVein',skill:'mining',gatherLvl:1,hp:3,maxHp:3,respawnTime:30000,name:'V',baseName:'Copper Ore',resourceType:'ore',color:'#b08050',_tier:{streakColor:'#b08050'},_tierIdx:0};
  S.gatherNodes=[node];
  P.x=node.x-7;P.y=node.y-86;P.vx=0;P.vy=0;
  const now=Date.now();
  S._extraction={nodeId:'qa-ore',nodeRef:node,skill:'mining',startedAt:now,windowOpensAt:now-100,windowClosesAt:now+9e9,status:'ready',progress:0,reps:0,repsTarget:3,swipeSamples:[]};
});
await page.waitForTimeout(800);
const r=await page.evaluate(()=>{
  const S=window._gameState.current;const node=S.gatherNodes[0];
  const R=window._pixiRenderer||{};let stage=null;const app=R.app||(R.pixiApp&&R.pixiApp.app);if(app&&app.stage)stage=app.stage;
  function find(n){if(!n)return null;if(n._spriteBody)return n;if(n.children)for(const c of n.children){const r=find(c);if(r)return r;}return null;}
  const pl=stage?find(stage):null;
  // ore reparented above player: its parent layer must sit AFTER the player layer in the world container
  let oreAbovePlayer=null;
  try{
    const oreLayer=node._pixiSprite&&node._pixiSprite.parent;
    const playerLayer=pl&&pl.parent;
    if(oreLayer&&playerLayer&&oreLayer.parent===playerLayer.parent){
      const sibs=oreLayer.parent.children;
      oreAbovePlayer=sibs.indexOf(oreLayer)>sibs.indexOf(playerLayer);
    }
  }catch(e){}
  return { facing:S._renderFacing, exSkill:S._extraction&&S._extraction.skill,
    weaponVisible: pl&&pl._weaponContainer?pl._weaponContainer.visible:null, oreAbovePlayer };
});
console.log('result',JSON.stringify(r));
console.log('errors',JSON.stringify(errors.slice(0,4)));
const ok=errors.length===0 && r.exSkill==='mining' && r.facing==='south' && r.weaponVisible===false && r.oreAbovePlayer===true;
console.log(ok?'PASS: mining faces south, weapon hidden, ore renders above player':'FAIL');
await browser.close(); process.exit(ok?0:1);
