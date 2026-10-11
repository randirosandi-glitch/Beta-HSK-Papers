(function(){
  function setListeningOptions(code,id,opts,key){
    const qs=DB[code]?.listening?.flatMap(s=>s.questions||[])||[];
    const q=qs.find(x=>String(x[0])===String(id));
    if(q){q[2]=opts.slice();q[3]=key;}
  }
  function setWritingBank(code,id,bank){
    const qs=DB[code]?.writing?.[0]?.questions||[];
    const q=qs.find(x=>String(x[0])===String(id));
    if(q)q[1]=bank;
  }
  // Verified source corrections in the main HSK4 data.
  setListeningOptions('H41002',14,['没兴趣','票很贵','票不好买','喜欢打网球'],'C');
  const w=DB.H41332?.writing?.[0]?.questions?.find(q=>String(q[0])==='87');
  if(w)w[1]='著名的 是 她丈夫 京剧演员';

  // Verified source options for questions whose option arrays were lost in the baseline.
  const missing={
    H41111:{21:[['银行','理发店','大使馆','公共汽车站'],'A'],35:[['季节','网站','日记','电脑'],'D']},
    H41332:{20:[['王教授','李校长','他孙女儿','一位护士'],'A'],26:[['做汤','做蛋糕','民族文化','儿童音乐'],'B'],34:[['预习','填表格','收拾房间','整理材料'],'A']},
    H41553B:{21:[['来晚了','没带伞','手机响了','手表丢了'],'A'],26:[['同学','邻居','师生','顾客和售货员'],'A'],35:[['迷路了','丢了护照','没换登机牌','打不开行李箱'],'D']},
    H41553C:{21:[['迟到了','拿错伞了','忘密码了','弄错顺序了'],'B'],26:[['被批评了','被人骗了','赚了很多钱','找到 100 元'],'D'],35:[['超市','银行','篮球场','游泳馆'],'A']},
    H41553D:{21:[['20 块','30 块','40 块','60 块'],'B'],26:[['颜色暗','画得很好','声音太大','味道不错'],'B'],35:[['请假','交作业','送照片','想报名'],'D']}
  };
  Object.entries(missing).forEach(([code,items])=>Object.entries(items).forEach(([id,v])=>setListeningOptions(code,id,v[0],v[1])));

  // Verified source chip grouping for Workbook HSK4b Writing Part 1.
  setWritingBank('WB4B01',48,'这种 能 减轻 方法 有效地 压力');
  setWritingBank('WB4B04',45,'一个 美丽的 生活 他在 小城市');
  setWritingBank('WB4B05',45,'儿童被 好玩儿的 更容易 游戏 接受');
  setWritingBank('WB4B06',45,'传真号码 是 你们 多少 公司 的');
  setWritingBank('WB4B08',46,'我顺便 回来的路上 邮局 去了趟');
  setWritingBank('WB4B08',48,'密码 你爸 把 信用卡的 了 改');

  // The workbook sources use the standard first-section ranges 44–48.
  // Ensure the word-bank renderer remains constrained to those five items.
  window.__finalAuditApplied=true;

  // HSK 4 score page should show only the 25 regular HSK4 packages.
  const oldRenderScores=window.renderScores;
  if(typeof oldRenderScores==='function'){
    window.renderScores=function(){
      const saved=window.__finalScoreFilter;
      window.__finalScoreFilter=true;
      try{return oldRenderScores.apply(this,arguments)}finally{window.__finalScoreFilter=saved}
    };
  }


})();
