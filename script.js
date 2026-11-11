(() => {
  "use strict";
  const PRICE = 10000;
  const menus = ["Kopi Kapal Api","Kopi Luwak","Kopi Matcha","Kopi Gula Aren","Kopi Pahit","Kopi (Original)"];
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
  const formatRupiah = value => "Rp " + Number(value).toLocaleString("id-ID");

  // Welcome: tiap huruf dibuka dengan mask pendek, bukan caret/typing standar.
  const welcome = "Welcome To Resto   ᙃᴀ̷𝖿ᴢᴢ Coffe";
  const welcomeNode = $("#welcomeText");
  let welcomeIndex = 0;
  function writeWelcome() {
    if (!welcomeNode || welcomeIndex >= welcome.length) {
      window.setTimeout(closeSplash, 950);
      return;
    }
    const char = welcome[welcomeIndex++];
    const span = document.createElement("span");
    span.textContent = char === " " ? "\u00a0" : char;
    welcomeNode.append(span);
    window.setTimeout(writeWelcome, char === " " ? 42 : 65);
  }
  function closeSplash() {
    $("#splash")?.classList.add("closed");
    document.body.classList.remove("intro-lock");
    setTimeout(() => $("#splash")?.setAttribute("hidden", ""), 900);
  }
  $("#skipSplash")?.addEventListener("click", closeSplash);
  writeWelcome();

  // Tab switching with a brief falling-coffee transition.
  function makeDrops() {
    const layer = $("#transitionDrops");
    if (!layer) return;
    layer.innerHTML = "";
    for (let i=0;i<12;i++) {
      const drop = document.createElement("i");
      drop.style.left = (4 + Math.random()*92) + "%";
      drop.style.animationDelay = (Math.random()*.18) + "s";
      drop.style.height = (8 + Math.random()*9) + "px";
      layer.append(drop);
    }
    setTimeout(() => layer.replaceChildren(), 950);
  }
  function switchTab(name) {
    makeDrops();
    $$(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.tab === name));
    $$(".tab-panel").forEach(panel => {
      const active = panel.dataset.panel === name;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });
    window.scrollTo({top:0,behavior:"smooth"});
    setTimeout(observeReveals, 60);
  }
  $$(".nav-link").forEach(button => button.addEventListener("click", () => switchTab(button.dataset.tab)));
  $$("[data-tab-link]").forEach(link => link.addEventListener("click", event => {
    event.preventDefault(); switchTab(link.dataset.tabLink);
  }));

  // Scroll reveal: clip-path + skewed entrance.
  let revealObserver;
  function observeReveals() {
    if (revealObserver) revealObserver.disconnect();
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, {threshold:.12,rootMargin:"0px 0px -35px 0px"});
    $$(".reveal").forEach(node => {
      if (!node.classList.contains("is-visible")) revealObserver.observe(node);
    });
  }
  observeReveals();

  // Carousel: native touch scroll + pointer drag with a small inertial tail.
  const track = $("#menuTrack");
  const cards = $$(".menu-card", track || document);
  let pointerDown=false, pointerStart=0, scrollStart=0, lastX=0, lastTime=0, velocity=0;
  if (track) {
    track.addEventListener("pointerdown", event => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointerDown=true; pointerStart=event.clientX; scrollStart=track.scrollLeft;
      lastX=event.clientX; lastTime=performance.now(); velocity=0;
      track.classList.add("dragging"); track.setPointerCapture(event.pointerId);
    });
    track.addEventListener("pointermove", event => {
      if (!pointerDown) return;
      const now=performance.now(), dx=event.clientX-lastX, dt=Math.max(1,now-lastTime);
      velocity=dx/dt; lastX=event.clientX; lastTime=now;
      track.scrollLeft=scrollStart-(event.clientX-pointerStart);
    });
    const finishDrag = () => {
      if (!pointerDown) return;
      pointerDown=false; track.classList.remove("dragging");
      let remaining=Math.max(-1.5,Math.min(1.5,velocity*16));
      const glide=() => {
        if (Math.abs(remaining)<.08) return;
        track.scrollLeft-=remaining*10; remaining*=.88; requestAnimationFrame(glide);
      };
      requestAnimationFrame(glide);
    };
    track.addEventListener("pointerup",finishDrag);
    track.addEventListener("pointercancel",finishDrag);
    track.addEventListener("lostpointercapture",finishDrag);
    $("#prevMenu")?.addEventListener("click",()=>track.scrollBy({left:-track.clientWidth*.78,behavior:"smooth"}));
    $("#nextMenu")?.addEventListener("click",()=>track.scrollBy({left:track.clientWidth*.78,behavior:"smooth"}));
    const updateCarousel = () => {
      const max=Math.max(1,track.scrollWidth-track.clientWidth);
      const progress=Math.min(100,Math.max(16.66,track.scrollLeft/max*100));
      $("#carouselProgress").style.width=progress+"%";
      const index=Math.min(6,Math.floor(track.scrollLeft/(cards[0]?.offsetWidth+18))+1);
      $("#carouselCount").textContent=String(index).padStart(2,"0")+" — 06";
    };
    track.addEventListener("scroll",updateCarousel,{passive:true});
    updateCarousel();
  }

  // Order sub-view and real-time total.
  // Isi nomor WhatsApp sendiri dengan format internasional tanpa tanda + atau spasi.
  const ORDER_EMAIL = "ubaydillah7@gmail.com";
  const WHATSAPP_NUMBER = "";
  const orderView=$("#orderView"), menuSection=$(".menu-section");
  $("#openOrder")?.addEventListener("click",()=>{
    orderView.hidden=false; menuSection.hidden=true; $("#orderMenu").focus();
    window.scrollTo({top:orderView.offsetTop-70,behavior:"smooth"}); observeReveals();
  });
  $("#backToMenu")?.addEventListener("click",()=>{
    orderView.hidden=true; menuSection.hidden=false;
    window.scrollTo({top:menuSection.offsetTop-70,behavior:"smooth"}); observeReveals();
  });
  function updateTotal() {
    const qty=Math.max(1,Math.min(99,Number($("#orderQty").value)||1));
    $("#orderQty").value=qty;
    const total=$("#orderTotal");
    total.textContent=formatRupiah(qty*PRICE);
    total.classList.remove("price-drop");
    void total.offsetWidth;
    total.classList.add("price-drop");
  }
  $("#orderQty")?.addEventListener("input",updateTotal);

  function getOrderDetails() {
    const menu=$("#orderMenu").value;
    const qty=Math.max(1,Math.min(99,Number($("#orderQty").value)||1));
    const location=$("#orderLocation").value.trim();
    if (!menu || !menus.includes(menu) || !location || qty<1 || qty>99) {
      $("#orderMessage").textContent="Lengkapi menu, jumlah, dan alamat pesanan terlebih dahulu.";
      return null;
    }
    return {
      menu, qty, location, total:qty*PRICE,
      time:new Date().toLocaleString("id-ID",{dateStyle:"full",timeStyle:"medium"})
    };
  }
  function orderMessage(data) {
    return [
      "PESANAN BARU — ᙃᴀ̷𝖿ᴢᴢ Coffe",
      "",
      `Menu: ${data.menu}`,
      `Jumlah: ${data.qty} cup`,
      `Harga satuan: ${formatRupiah(PRICE)}`,
      `Total: ${formatRupiah(data.total)}`,
      `Lokasi / alamat: ${data.location}`,
      `Waktu: ${data.time}`,
      "",
      "Dikirim melalui website ᙃᴀ̷𝖿ᴢᴢ Coffe."
    ].join("\n");
  }
  $("#orderForm")?.addEventListener("submit",event=>{
    event.preventDefault();
    const data=getOrderDetails();
    if(!data)return;
    const subject=encodeURIComponent(`Pesanan ᙃᴀ̷𝖿ᴢᴢ Coffe — ${data.menu}`);
    const body=encodeURIComponent(orderMessage(data));
    $("#orderMessage").textContent="Membuka aplikasi email. Periksa rincian pesanan lalu tekan Kirim.";
    $(".submit-button",event.currentTarget)?.classList.add("loading");
    window.location.href=`mailto:${ORDER_EMAIL}?subject=${subject}&body=${body}`;
    window.setTimeout(()=>$(".submit-button",event.currentTarget)?.classList.remove("loading"),1200);
  });
  $("#whatsappOrder")?.addEventListener("click",()=>{
    const data=getOrderDetails();
    if(!data)return;
    if(!WHATSAPP_NUMBER){
      $("#orderMessage").textContent="Nomor WhatsApp belum diisi. Isi WHATSAPP_NUMBER di bagian atas script.js.";
      return;
    }
    const url=`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage(data))}`;
    window.open(url,"_blank","noopener,noreferrer");
    $("#orderMessage").textContent="WhatsApp dibuka dengan rincian pesanan. Periksa lalu tekan Kirim.";
  });

  // Rating, komentar, dan foto: data dimuat dari server (ratings.json + folder uploads).
  const samples = [
    ["Alya","Kopi Gula Aren","Manisnya pas, aroma kopinya tetap terasa. Cocok untuk sore yang santai."],
    ["Raka","Kopi Kapal Api","Rasa klasik yang familiar. Disajikan hangat dan nyaman."],
    ["Nadia","Kopi Matcha","Perpaduannya unik, ada earthy dari matcha dan aroma kopi."],
    ["Dimas","Kopi Pahit","Bold dan tidak berlebihan. Pilihan yang pas untuk penikmat kopi hitam."],
    ["Fira","Kopi Luwak","Rasanya lembut dan aromanya cukup berkesan."],
    ["Bagas","Kopi (Original)","Sederhana, enak, dan cocok diminum kapan saja."],
    ["Sinta","Kopi Gula Aren","Ada rasa karamel yang lembut. Tidak terlalu manis."],
    ["Ilham","Kopi Kapal Api","Kopi harian dengan karakter yang tegas. Recommended."],
    ["Mira","Kopi Matcha","Warna dan rasanya menarik. Ingin coba lagi."],
    ["Yoga","Kopi Pahit","Aftertaste cukup panjang dan aromanya kuat."]
  ].map(([name,menu,comment],i)=>({name,menu,comment,rating:5,date:"10 NOV 2026",id:"sample-"+i}));
  const reviewList=$("#reviewList");
  function renderReviews(items) {
    reviewList.innerHTML="";
    items.forEach((item,index)=>{
      const card=document.createElement("article"); card.className="review-card"; card.style.animationDelay=(Math.min(index,12)*45)+"ms";
      const initial=document.createElement("div"); initial.className="review-initial"; initial.textContent=(item.name||"T").trim().charAt(0).toUpperCase();
      const body=document.createElement("div");
      const stars=document.createElement("div"); stars.className="review-stars"; stars.textContent="★★★★★".slice(0,Math.max(1,Math.min(5,Number(item.rating)||5)));
      const title=document.createElement("h4"); title.textContent=item.name||"Pengunjung";
      const comment=document.createElement("p"); comment.textContent=item.comment||"Terima kasih sudah singgah.";
      const meta=document.createElement("div"); meta.className="review-meta"; meta.textContent=(item.menu||"Menu kopi")+"  /  "+(item.date||"BARU");
      body.append(stars,title,comment);
      if(item.photo){
        const photo=document.createElement("img");
        photo.className="review-photo";
        photo.src=item.photo;
        photo.alt=`Foto ulasan dari ${item.name||"pengunjung"}`;
        photo.loading="lazy";
        body.append(photo);
      }
      card.append(initial,body,meta); reviewList.append(card);
    });
    $("#reviewCount").textContent=items.length+" CERITA";
    const count=items.length;
    const average=count?items.reduce((sum,item)=>sum+(Number(item.rating)||0),0)/count:0;
    $("#averageRating").textContent=average.toFixed(1);
    $("#summaryStars").textContent="★★★★★";
    $("#summaryStars").style.setProperty("--rating-fill",`${average/5*100}%`);
    $("#ratingTotal").textContent=count+" ULASAN";
  }
  async function loadReviews() {
    try {
      const response=await fetch("/api/rating");
      if (!response.ok) throw new Error("API tidak tersedia");
      const data=await response.json();
      const serverReviews=Array.isArray(data.comments)?data.comments:[];
      renderReviews(serverReviews.length?serverReviews:samples);
    } catch { renderReviews(samples); }
  }
  loadReviews();
  let selectedRating=5;
  function setRating(value) {
    selectedRating=value;
    $$("#starPicker button").forEach(button=>{
      const active=Number(button.dataset.star)<=value;
      button.classList.toggle("selected",active);
      button.setAttribute("aria-checked",String(Number(button.dataset.star)===value));
    });
  }
  $$("#starPicker button").forEach(button=>button.addEventListener("click",()=>setRating(Number(button.dataset.star))));
  setRating(5);
  $("#ratingForm")?.addEventListener("submit",async event=>{
    event.preventDefault();
    const form=event.currentTarget;
    const payload={
      name:$("#reviewName").value.trim(),
      menu:$("#reviewMenu").value,
      rating:selectedRating,
      comment:$("#reviewComment").value.trim()
    };
    const photo=$("#reviewPhoto")?.files?.[0];
    const message=$("#ratingMessage");
    if (!payload.name||!payload.menu||!payload.comment) {message.textContent="Lengkapi nama, menu, rating, dan komentar.";return;}
    if(photo && photo.size>3*1024*1024){message.textContent="Ukuran foto maksimal 3 MB.";return;}
    const formData=new FormData();
    Object.entries(payload).forEach(([key,value])=>formData.append(key,String(value)));
    if(photo)formData.append("photo",photo);
    const submit=form.querySelector('button[type="submit"]');
    submit?.classList.add("loading");
    message.textContent="Mengirim cerita ke server...";
    try {
      const response=await fetch("/api/rating",{method:"POST",body:formData});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Gagal mengirim cerita.");
      message.textContent="CERITAMU SUDAH TERSIMPAN DI SERVER — terima kasih.";
      form.reset(); setRating(5); await loadReviews();
    } catch(error) {
      message.textContent=error.message+" Pastikan server aktif dan penyimpanan hosting tersedia.";
    } finally {
      submit?.classList.remove("loading");
    }
  });

  // Coffee information. Nutrition figures are indicative, not lab-tested product claims.
  const nutrition = {
    "Kopi Kapal Api":{eyebrow:"CLASSIC BLEND / 01",description:"Kopi dengan karakter panggang dan rasa yang akrab. Cocok dinikmati hangat sebagai teman memulai hari.",benefits:"Mengandung kafein; dapat membantu meningkatkan kewaspadaan sementara.",popularity:"Sangat dikenal di Indonesia",calories:"2–5 kkal",protein:"0,2 g",fat:"0 g",carbs:"0–1 g",caffeine:"± 60–100 mg",vitamins:"Jejak vitamin B3 dan mineral",notes:"Tanpa gula tambahan (estimasi kopi hitam)"},
    "Kopi Luwak":{eyebrow:"SELECTED ROAST / 02",description:"Kopi yang dikenal melalui proses pascapanen khusus. Karakter seduhan sangat dipengaruhi asal biji dan proses sangrai.",benefits:"Seperti kopi hitam lain, mengandung antioksidan alami dan kafein.",popularity:"Premium / niche",calories:"2–5 kkal",protein:"0,2 g",fat:"0 g",carbs:"0–1 g",caffeine:"± 60–100 mg",vitamins:"Jejak vitamin B3, magnesium",notes:"Angka bergantung varietas dan seduhan"},
    "Kopi Matcha":{eyebrow:"GREEN NOTES / 03",description:"Perpaduan kopi dan matcha. Matcha membawa rasa vegetal dan senyawa katekin; kandungan akhir bergantung takaran campuran.",benefits:"Matcha mengandung katekin; kopi dan matcha sama-sama menyumbang kafein.",popularity:"Populer di menu kreasi",calories:"± 10–90 kkal",protein:"0,5–3 g",fat:"0–3 g",carbs:"1–12 g",caffeine:"± 70–140 mg",vitamins:"Vitamin K dan sedikit vitamin C dari matcha",notes:"Estimasi; tergantung susu dan pemanis"},
    "Kopi Gula Aren":{eyebrow:"PALM SUGAR / 04",description:"Kopi dengan tambahan gula aren yang memberi rasa manis karamel. Kandungan gula membuat energinya lebih tinggi daripada kopi hitam.",benefits:"Memberi energi dari karbohidrat; tetap perhatikan jumlah gula tambahan.",popularity:"Sangat populer di kedai kopi",calories:"± 70–130 kkal",protein:"0–2 g",fat:"0–2 g",carbs:"15–28 g",caffeine:"± 60–100 mg",vitamins:"Mineral dalam jumlah kecil dari gula aren",notes:"Estimasi 1 sajian dengan gula aren"},
    "Kopi Pahit":{eyebrow:"PURE BLACK / 05",description:"Seduhan kopi tanpa gula dan susu. Profil rasa lebih langsung menampilkan karakter biji dan tingkat sangrai.",benefits:"Kopi hitam mengandung polifenol; kafein dapat meningkatkan kewaspadaan sementara.",popularity:"Klasik di kalangan penikmat kopi",calories:"2–5 kkal",protein:"0,2 g",fat:"0 g",carbs:"0–1 g",caffeine:"± 60–100 mg",vitamins:"Jejak vitamin B2, B3, magnesium",notes:"Tanpa gula dan susu"},
    "Kopi (Original)":{eyebrow:"THE ORIGINAL / 06",description:"Sajian kopi original dengan rasa seimbang. Komposisi dan nilai gizi bergantung pada jenis biji serta metode seduh.",benefits:"Mengandung polifenol alami dan kafein.",popularity:"Menu dasar yang umum",calories:"2–5 kkal",protein:"0,2 g",fat:"0 g",carbs:"0–1 g",caffeine:"± 60–100 mg",vitamins:"Jejak vitamin B2, B3, magnesium",notes:"Estimasi kopi hitam tanpa tambahan"}
  };
  const infoImage={"Kopi Kapal Api":"image-kapal","Kopi Luwak":"image-luwak","Kopi Matcha":"image-matcha","Kopi Gula Aren":"image-aren","Kopi Pahit":"image-pahit","Kopi (Original)":"image-original"};
  function showInfo(menu) {
    const item=nutrition[menu]; if(!item)return;
    $$(".coffee-choice").forEach(button=>button.classList.toggle("selected",button.dataset.info===menu));
    const detail=$("#infoDetail"); detail.style.animation="none"; void detail.offsetWidth; detail.style.animation="";
    $("#infoPhoto").className="info-photo "+infoImage[menu];
    $("#infoPhoto").querySelector(".info-cup").textContent=menu.split(" ").pop().charAt(0).replace(")","");
    $("#infoPhoto").querySelector(".info-photo-label").textContent=item.eyebrow;
    $("#infoEyebrow").textContent=item.eyebrow; $("#infoTitle").textContent=menu; $("#infoDescription").textContent=item.description;
    const rows=[
      ["Manfaat",item.benefits],["Gizi",item.notes],["Vitamin",item.vitamins],["Tingkat kepopuleran",item.popularity],
      ["Kalori",item.calories],["Protein",item.protein],["Lemak",item.fat],["Karbohidrat",item.carbs],["Kafein",item.caffeine]
    ];
    $("#nutritionRows").innerHTML="";
    rows.forEach(([label,value],index)=>{
      const tr=document.createElement("tr");tr.style.animationDelay=(index*55)+"ms";
      const a=document.createElement("td"),b=document.createElement("td");a.textContent=label;b.textContent=value;tr.append(a,b);$("#nutritionRows").append(tr);
    });
  }
  $$(".coffee-choice").forEach(button=>button.addEventListener("click",()=>showInfo(button.dataset.info)));
  showInfo(menus[0]);
})();