// The showcase: the app's bottom bar drives a sliding strip of screenshots.
// It cycles on its own until you take over.
(function () {
  "use strict";

  var track  = document.getElementById("track");
  var bar    = document.querySelector(".tabbar");
  var tabs   = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));

  if (!track || !bar || !tabs.length) return;

  var DWELL  = 2000;                 // ms each tab stays up
  var calm   = window.matchMedia("(prefers-reduced-motion: reduce)");
  var index  = 0;
  var timer  = null;
  var paused = false;
  var manual = false;                // set once the visitor picks a tab

  function show(i) {
    index = (i + tabs.length) % tabs.length;

    track.style.transform = "translateX(" + (-25 * index) + "%)";

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
    bar.style.setProperty("--dwell", DWELL + "ms");
    timer = setInterval(tick, DWELL);
    show(index);                     // re-arm the sliver
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

  // Only run while the showcase is actually on screen.
  var section = document.getElementById("features");
  if (section && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries[0].isIntersecting ? resume() : hold();
    }, { threshold: 0.25 }).observe(section);
  } else {
    play();
  }

  show(0);
})();

// Motion: reveal on scroll, progress, active nav link, a little pointer tilt.
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

  // ── the hero phone leans toward the pointer ─────────────────────
  var phone = document.getElementById("heroPhone");
  if (phone && !calm.matches && window.matchMedia("(hover: hover)").matches) {
    var hero = document.querySelector(".hero");
    var idle;

    hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width  - 0.5;   // -0.5 … 0.5
      var y = (e.clientY - r.top)  / r.height - 0.5;

      phone.classList.add("tilting");
      phone.style.transform =
        "rotateY(" + (x * 9).toFixed(2) + "deg) " +
        "rotateX(" + (-y * 7).toFixed(2) + "deg) " +
        "translateY(" + (y * -6).toFixed(1) + "px)";

      clearTimeout(idle);
      idle = setTimeout(release, 220);
    });

    hero.addEventListener("mouseleave", release);

    function release() {
      phone.style.transform = "";
      phone.classList.remove("tilting");      // hands it back to the bob
    }
  }
})();
