// The iPad: a bar of tabs drives a sliding strip of screenshots.
// Each cycles on its own until you take over.
(function () {
  "use strict";

  var calm = window.matchMedia("(prefers-reduced-motion: reduce)");

  function cycle(track, bar, panels, section, dwell, item) {
    if (!track || !bar) return;
    var tabs   = Array.prototype.slice.call(bar.querySelectorAll(item || ".tab"));
    if (!tabs.length) return;

    var index  = 0;
    var timer  = null;
    var paused = false;
    var manual = false;              // set once the visitor picks a tab

    function show(i) {
      index = (i + tabs.length) % tabs.length;

      track.style.transform = "translateX(" + (-100 / tabs.length * index) + "%)";

      tabs.forEach(function (t, n) {
        var on = n === index;
        t.classList.toggle("is-on", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
        // restart the sliver cleanly on every change
        t.classList.remove("is-timing");
        if (on && !manual && !paused && !calm.matches) {
          void t.offsetWidth;
          t.classList.add("is-timing");
        }
      });

      panels.forEach(function (p, n) {
        p.classList.toggle("is-on", n === index);
      });
    }

    function tick() { if (!paused) show(index + 1); }

    function play() {
      stop();
      if (manual || calm.matches) return;
      bar.style.setProperty("--dwell", dwell + "ms");
      timer = setInterval(tick, dwell);
      show(index);                   // re-arm the sliver
    }

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    function takeOver(i) {
      manual = true;
      stop();
      tabs.forEach(function (t) { t.classList.remove("is-timing"); });
      show(i);
    }

    tabs.forEach(function (t, n) {
      t.addEventListener("click", function () { takeOver(n); });
    });

    // Left/right arrows move between tabs, as a tablist should.
    bar.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      takeOver(e.key === "ArrowRight" ? index + 1 : index - 1);
      tabs[index].focus();
      e.preventDefault();
    });

    // Hold still while someone is reading or pointing at it.
    function hold()   { paused = true;  stop(); tabs.forEach(function (t) { t.classList.remove("is-timing"); }); }
    function resume() { paused = false; if (!manual) play(); }

    bar.addEventListener("mouseenter", hold);
    bar.addEventListener("mouseleave", resume);
    bar.addEventListener("focusin", hold);
    bar.addEventListener("focusout", resume);

    document.addEventListener("visibilitychange", function () {
      document.hidden ? hold() : resume();
    });

    // Only run while it is actually on screen.
    if (section && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? resume() : hold();
      }, { threshold: 0.25 }).observe(section);
    } else {
      play();
    }

    show(0);
  }

  cycle(document.getElementById("tabletTrack"),
        document.getElementById("tabletBar"),
        [], document.querySelector(".tablet"), 3000);
})();

// Motion: reveal on scroll, progress, active nav link.
(function () {
  "use strict";

  var calm = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ── reveal ──────────────────────────────────────────────────────
  var targets = Array.prototype.slice.call(document.querySelectorAll("[data-reveal], .ticks"));

  if (calm.matches || !("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("in"); });
  } else {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        seen.unobserve(e.target);          // reveal once, then leave it alone
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    targets.forEach(function (el) { seen.observe(el); });
  }

  // The wires keep their looping animation, so they are watched separately
  // and allowed to stop when they scroll away.
  var wires = document.querySelector(".wires");
  if (wires && !calm.matches && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      wires.classList.toggle("in", entries[0].isIntersecting);
    }, { threshold: 0.3 }).observe(wires);
  }

  // ── scroll progress + active nav link ───────────────────────────
  var bar      = document.getElementById("progress");
  var links    = Array.prototype.slice.call(document.querySelectorAll(".nav-links a"));
  var sections = links
        .map(function (a) { return document.querySelector(a.getAttribute("href")); })
        .filter(Boolean);

  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;

      if (bar) {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
      }

      // whichever section last crossed the top third of the screen
      var mark = window.scrollY + window.innerHeight / 3;
      var at = -1;
      sections.forEach(function (sec, i) {
        if (sec.offsetTop <= mark) at = i;
      });
      links.forEach(function (a, i) { a.classList.toggle("here", i === at); });
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
})();

// The hero phone: four silent clips of the app, at the pace of the Get started video, one after
// another. Each line of its captions shows while its part plays. The screen is shown whole, as on
// a phone: no zooms. It plays only while it's on screen, and stays still for reduced motion.
(function () {
  "use strict";

  var reel = document.getElementById("heroReel");
  var bar  = document.getElementById("heroTabs");
  if (!reel || !bar) return;

  var calm   = window.matchMedia("(prefers-reduced-motion: reduce)");
  var clips  = Array.prototype.slice.call(reel.querySelectorAll(".reel-clip"));
  var tabs   = Array.prototype.slice.call(bar.querySelectorAll(".reel-tab"));
  var sets   = Array.prototype.slice.call(document.querySelectorAll("#heroCaptions .reel-lines"));
  var lines  = sets.map(function (set) {
    return Array.prototype.slice.call(set.querySelectorAll("li")).map(function (li) {
      return { el: li, from: parseFloat(li.dataset.from), to: parseFloat(li.dataset.to) };
    });
  });

  var index = 0, seen = false, frame = 0;

  function paint() {
    var v = clips[index], t = v.currentTime || 0;
    lines[index].forEach(function (line, n) {
      // the last line stays to the end
      var on = t >= line.from && (t < line.to || n === lines[index].length - 1);
      line.el.classList.toggle("is-on", on);
    });
    var bit = tabs[index].querySelector(".bar");
    if (bit) bit.style.transform = "scaleX(" + (v.duration ? Math.min(t / v.duration, 1) : 0) + ")";
  }

  function loop() {
    paint();
    frame = requestAnimationFrame(loop);
  }

  function show(i, play) {
    clips[index].pause();
    index = (i + clips.length) % clips.length;
    clips.forEach(function (v, n) { v.classList.toggle("is-on", n === index); });
    tabs.forEach(function (t, n) {
      var on = n === index;
      t.classList.toggle("is-on", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      var bit = t.querySelector(".bar");
      if (bit) bit.style.transform = "scaleX(0)";
    });
    sets.forEach(function (s, n) { s.classList.toggle("is-on", n === index); });
    var v = clips[index];
    // the next one, ready before its turn
    clips[(index + 1) % clips.length].preload = "auto";
    try { v.currentTime = 0; } catch (e) {}
    if (play) start(); else paint();
  }

  function start() {
    if (calm.matches) { paint(); return; }
    var v = clips[index];
    v.muted = true;
    var p = v.play();
    if (p && p.catch) p.catch(function () { paint(); });   // no autoplay (Low Power Mode): it stays still
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(loop);
  }

  function stop() {
    clips[index].pause();
    cancelAnimationFrame(frame);
  }

  clips.forEach(function (v, n) {
    v.addEventListener("ended", function () { if (n === index) show(index + 1, seen && !document.hidden); });
  });

  tabs.forEach(function (t, n) {
    t.addEventListener("click", function () { show(n, true); });
  });
  bar.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    show(e.key === "ArrowRight" ? index + 1 : index - 1, true);
    tabs[index].focus();
    e.preventDefault();
  });
  // a tap on a still screen (no autoplay) plays it
  reel.addEventListener("click", function () { if (clips[index].paused) start(); });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else if (seen) start();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      seen = entries[0].isIntersecting;
      seen ? start() : stop();
    }, { threshold: 0.25 }).observe(reel);
  } else {
    seen = true;
    start();
  }
  paint();
})();
