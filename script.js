/* Haydn McIntyre — site behaviour. No dependencies. */
(function () {
  "use strict";

  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduceMotion = motionQuery.matches;
  var heroField = null; // the canvas exposes go/stop here once it is set up

  /* Pause every CSS animation while the tab is in the background. */
  document.addEventListener("visibilitychange", function () {
    document.body.classList.toggle("paused", document.hidden);
  });

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---- Email, assembled at runtime so it is not sitting in the markup ---- */
  var mailUser = ["haydn", "mcintyre"].join("");
  var mailHost = ["yahoo", "ca"].join(".");
  var EMAIL = mailUser + "@" + mailHost;

  document.querySelectorAll("[data-mail]").forEach(function (el) {
    el.setAttribute("href", "mailto:" + EMAIL);
  });

  /* ---- Sticky bar goes solid once you leave the hero --------------------- */
  var topbar = document.getElementById("topbar");
  if (topbar) {
    var onScroll = function () {
      topbar.classList.toggle("is-stuck", window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- Mobile menu ------------------------------------------------------ */
  var toggle = document.querySelector(".menu-toggle");
  var mobileNav = document.getElementById("mobile-nav");

  if (toggle && mobileNav) {
    var setMenu = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      mobileNav.hidden = !open;
    };
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    mobileNav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* ---- Hero particle field ----------------------------------------------
     Drifting particles over the gradient wash, with the occasional electric
     arc jumping between two that pass close to each other. Arcs are brief
     sparks rather than permanent lines — it reads as charge, not cobweb. */
  (function () {
    var canvas = document.getElementById("hero-canvas");
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext("2d");
    var w = 0, h = 0, dpr = 1;
    var running = false, frame = 0, last = 0;
    var particles = [];
    var arcs = [];

    var ARC_RANGE = 150;    // how close two particles must pass to spark
    var ARC_CHANCE = 0.055; // per eligible pair, per second
    var ARC_LIFE = 300;     // ms

    var PULL_REACH = 250;   // how far the cursor's pull carries
    var PULL_FORCE = 165;   // px/s² at the centre of that reach
    var CURSOR_ARC_RANGE = 190;
    var CURSOR_ARC_CHANCE = 1.0; // per particle in range, per second

    /* live object — arcs hold a reference, so a bolt follows the cursor */
    var cursor = { x: 0, y: 0, on: false };

    var rand = function (min, max) { return min + Math.random() * (max - min); };

    var build = function () {
      /* particle count scales with area, but stays sane on a phone or a 4K panel */
      var target = Math.round((w * h) / 16000);
      target = Math.max(26, Math.min(target, 80));

      particles = [];
      for (var i = 0; i < target; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          bvx: rand(-24, 24),         // base drift, px per second
          bvy: rand(-19, 19),
          ivx: 0,                   // cursor-induced velocity, decays away
          ivy: 0,
          lit: 0,                   // 0..1, how close to the cursor
          r: rand(0.9, 2.3),
          hot: Math.random() < 0.3  // a few take the electric tint
        });
      }
      arcs = [];
    };

    var size = function () {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = canvas.getBoundingClientRect();
      w = Math.max(rect.width, 1);
      h = Math.max(rect.height, 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    var dot = function (p) {
      /* particles near the cursor warm toward the electric tint and brighten */
      var core = p.hot || p.lit > 0.45 ? "63, 217, 192" : "236, 241, 236";
      var boost = p.lit * 0.5;
      var scale = 1 + p.lit * 0.7;

      ctx.fillStyle = "rgba(" + core + ", " + (0.09 + p.lit * 0.1).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3.4 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(" + core + ", " + Math.min((p.hot ? 0.88 : 0.5) + boost, 1).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * scale, 0, Math.PI * 2);
      ctx.fill();
    };

    /* a jagged path between two points, so the spark looks like current */
    var bolt = function (a, b, seed) {
      var segs = 4;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      for (var i = 1; i < segs; i++) {
        var t = i / segs;
        var mx = a.x + (b.x - a.x) * t;
        var my = a.y + (b.y - a.y) * t;
        /* offset perpendicular to the run, alternating side */
        var nx = -(b.y - a.y), ny = b.x - a.x;
        var len = Math.sqrt(nx * nx + ny * ny) || 1;
        var jit = Math.sin(seed + i * 2.3) * 9;
        ctx.lineTo(mx + (nx / len) * jit, my + (ny / len) * jit);
      }
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    };

    var step = function (t) {
      var dt = Math.min((t - last) / 1000, 0.05); // clamp after a tab switch
      last = t;

      ctx.clearRect(0, 0, w, h);

      var damp = Math.exp(-2.1 * dt); // induced motion bleeds off when you stop
      var i, p, dx, dy, d, d2;

      for (i = 0; i < particles.length; i++) {
        p = particles[i];

        var target = 0;
        if (cursor.on) {
          dx = cursor.x - p.x;
          dy = cursor.y - p.y;
          d2 = dx * dx + dy * dy;
          if (d2 < PULL_REACH * PULL_REACH) {
            d = Math.sqrt(d2) || 1;
            target = 1 - d / PULL_REACH;
            /* ease off right at the centre so nothing collapses onto the pointer */
            var force = PULL_FORCE * target * Math.min(d / 40, 1);
            p.ivx += (dx / d) * force * dt;
            p.ivy += (dy / d) * force * dt;
          }
        }
        p.lit += (target - p.lit) * Math.min(dt * 6, 1);

        p.ivx *= damp;
        p.ivy *= damp;
        p.x += (p.bvx + p.ivx) * dt;
        p.y += (p.bvy + p.ivy) * dt;

        /* wrap around the edges so the field never thins out */
        if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;
        dot(p);
      }

      /* the cursor throws its own sparks at whatever drifts near it */
      if (cursor.on) {
        for (i = 0; i < particles.length; i++) {
          p = particles[i];
          dx = cursor.x - p.x;
          dy = cursor.y - p.y;
          if (dx * dx + dy * dy < CURSOR_ARC_RANGE * CURSOR_ARC_RANGE &&
              Math.random() < CURSOR_ARC_CHANCE * dt) {
            arcs.push({ a: cursor, b: p, born: t, seed: Math.random() * 10 });
          }
        }
      }

      /* spark between pairs that drift close together */
      for (i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var a = particles[i], b = particles[j];
          dx = a.x - b.x; dy = a.y - b.y;
          d2 = dx * dx + dy * dy;
          if (d2 < ARC_RANGE * ARC_RANGE && Math.random() < ARC_CHANCE * dt) {
            arcs.push({ a: a, b: b, born: t, seed: Math.random() * 10 });
          }
        }
      }

      ctx.lineCap = "round";
      for (i = arcs.length - 1; i >= 0; i--) {
        var arc = arcs[i];
        var age = (t - arc.born) / ARC_LIFE;
        if (age >= 1) { arcs.splice(i, 1); continue; }
        var fade = 1 - age;
        ctx.strokeStyle = "rgba(63, 217, 192, " + (fade * 0.55).toFixed(3) + ")";
        ctx.lineWidth = 1.6 * fade;
        bolt(arc.a, arc.b, arc.seed);
        /* a faint wide pass underneath reads as glow */
        ctx.strokeStyle = "rgba(63, 217, 192, " + (fade * 0.13).toFixed(3) + ")";
        ctx.lineWidth = 5 * fade;
        bolt(arc.a, arc.b, arc.seed);
      }

      if (running) frame = requestAnimationFrame(step);
    };

    var still = function () {
      /* reduced motion: one static frame, no drift and no sparks */
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < particles.length; i++) dot(particles[i]);
    };

    var stop = function () {
      running = false;
      cancelAnimationFrame(frame);
    };

    var go = function () {
      if (running || reduceMotion) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(step);
    };

    size();
    if (reduceMotion) {
      still();
    } else {
      go();
    }

    /* ---- Pointer ----------------------------------------------------------
       The canvas is pointer-events:none so it never eats clicks, so track on
       the window and translate into canvas space. */
    if (!reduceMotion) {
      var glow = document.getElementById("hero-cursor");

      var track = function (e) {
        var rect = canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var pad = 60; // keep responding just past the edges
        cursor.on = x > -pad && x < rect.width + pad && y > -pad && y < rect.height + pad;
        cursor.x = x;
        cursor.y = y;
        if (glow) {
          glow.style.setProperty("--cx", x + "px");
          glow.style.setProperty("--cy", y + "px");
          glow.classList.toggle("on", cursor.on);
        }
      };

      window.addEventListener("pointermove", track, { passive: true });
      window.addEventListener("pointerdown", track, { passive: true });
      /* only a finger lifting ends it — a mouse click should not */
      window.addEventListener("pointerup", function (e) {
        if (e.pointerType === "touch") cursor.on = false;
      }, { passive: true });
      window.addEventListener("pointercancel", function () { cursor.on = false; }, { passive: true });
      document.addEventListener("pointerleave", function () {
        cursor.on = false;
        if (glow) glow.classList.remove("on");
      });
      /* the hero scrolls out from under the pointer as often as the other way */
      window.addEventListener("scroll", function () {
        cursor.on = false;
        if (glow) glow.classList.remove("on");
      }, { passive: true });
    }

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        size();
        if (reduceMotion) still();
      }, 150);
    });

    /* don't burn frames on a hero nobody is looking at */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) go();
          else stop();
        });
      }, { threshold: 0 }).observe(canvas);
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else go();
    });

    heroField = { go: go, stop: stop, still: still };
  })();

  /* ---- Reduced motion, honoured live and in both directions --------------
     Someone can flip the OS setting with the page already open. Flipping in
     pins everything to its finished state; flipping back out re-arms it. */
  (function () {
    var pin = function () {
      document.querySelectorAll(".reveal, .head-anim, .bolt-rule, .rise").forEach(function (el) {
        el.classList.add("is-in");
      });
      if (heroField) { heroField.stop(); heroField.still(); }
    };

    var release = function () {
      if (heroField) heroField.go();
    };

    var onChange = function (e) {
      reduceMotion = e.matches;
      if (e.matches) pin();
      else release();
    };

    if (motionQuery.addEventListener) motionQuery.addEventListener("change", onChange);
    else if (motionQuery.addListener) motionQuery.addListener(onChange);
  })();

  /* ---- Lightbox ---------------------------------------------------------
     Click a project image to blow it up. Close with the X, Escape, or by
     clicking the backdrop. <dialog> gives us Escape and focus trapping free. */
  (function () {
    var dialog = document.getElementById("lightbox");
    var big = document.getElementById("lightbox-img");
    var close = document.getElementById("lightbox-close");
    if (!dialog || !big || !close || typeof dialog.showModal !== "function") return;

    var opener = null;

    var open = function (img) {
      opener = img.closest(".zoom");
      big.src = img.currentSrc || img.src;
      big.alt = img.alt;
      dialog.showModal();
      document.body.classList.add("is-locked");
      close.focus();
    };

    var shut = function () {
      if (dialog.open) dialog.close();
    };

    document.querySelectorAll(".zoom").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var img = btn.querySelector("img");
        if (img) open(img);
      });
    });

    close.addEventListener("click", shut);

    /* a click that lands on the dialog itself is a click on the backdrop */
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) shut();
    });

    dialog.addEventListener("close", function () {
      document.body.classList.remove("is-locked");
      big.removeAttribute("src");
      big.alt = "";
      if (opener) {
        opener.focus();
        opener = null;
      }
    });
  })();

  /* ---- Headings rise word by word ---------------------------------------
     Split into words, keep the original text on aria-label so screen readers
     read the heading normally rather than a pile of spans. */
  document.querySelectorAll(".h2").forEach(function (h) {
    var text = h.textContent.replace(/\s+/g, " ").trim();
    if (!text) return;
    h.setAttribute("aria-label", text);
    h.classList.add("head-anim");
    h.textContent = "";
    text.split(" ").forEach(function (word, i) {
      var outer = document.createElement("span");
      outer.className = "w";
      outer.setAttribute("aria-hidden", "true");
      var inner = document.createElement("span");
      inner.textContent = word;
      inner.style.setProperty("--wd", i * 60 + "ms");
      outer.appendChild(inner);
      h.appendChild(outer);
      h.appendChild(document.createTextNode(" "));
    });
  });

  /* ---- Scroll progress --------------------------------------------------- */
  var bar = document.getElementById("progress-bar");
  if (bar) {
    var ticking = false;
    var paint = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = "scaleX(" + Math.min(Math.max(pct, 0), 1).toFixed(4) + ")";
      ticking = false;
    };
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(paint); }
    }, { passive: true });
    paint();
  }

  /* ---- Section rail + nav highlighting ----------------------------------- */
  (function () {
    var rail = document.getElementById("rail");
    if (!rail || !("IntersectionObserver" in window)) return;

    var links = Array.prototype.slice.call(rail.querySelectorAll("a"));
    var navLinks = Array.prototype.slice.call(
      document.querySelectorAll(".nav a:not(.nav-cta)")
    );

    var setActive = function (id) {
      links.forEach(function (a) {
        a.classList.toggle("is-active", a.getAttribute("data-sec") === id);
      });
      navLinks.forEach(function (a) {
        a.classList.toggle("is-current", a.getAttribute("href") === "#" + id);
      });
    };

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });

    links.forEach(function (a) {
      var section = document.getElementById(a.getAttribute("data-sec"));
      if (section) spy.observe(section);
    });
  })();

  /* ---- Cursor spotlight on cards ----------------------------------------- */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".project, .layer").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", ((e.clientX - rect.left) / rect.width) * 100 + "%");
        card.style.setProperty("--my", ((e.clientY - rect.top) / rect.height) * 100 + "%");
      }, { passive: true });
    });
  }

  /* ---- Scroll reveals --------------------------------------------------- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );
    document.querySelectorAll(".reveal, .head-anim, .bolt-rule").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal, .head-anim, .bolt-rule").forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---- Contact form ----------------------------------------------------- */
  var form = document.getElementById("enquiry");
  if (!form) return;

  var status = document.getElementById("form-status");
  var submit = form.querySelector(".btn-submit");

  var showError = function (input, show) {
    var msg = form.querySelector('.err[data-for="' + input.id + '"]');
    if (msg) msg.hidden = !show;
    if (show) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  };

  var validate = function () {
    var ok = true;
    var first = null;
    ["f-name", "f-email", "f-msg"].forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      var bad = !input.value.trim() || (input.type === "email" && !input.checkValidity());
      showError(input, bad);
      if (bad && !first) first = input;
      if (bad) ok = false;
    });
    if (first) first.focus();
    return ok;
  };

  form.addEventListener("input", function (e) {
    if (e.target.getAttribute("aria-invalid") === "true") showError(e.target, false);
  });

  var setStatus = function (text, state) {
    if (!status) return;
    status.textContent = text;
    if (state) status.setAttribute("data-state", state);
    else status.removeAttribute("data-state");
  };

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) {
      setStatus("Check the highlighted fields.", "bad");
      return;
    }

    var data = new FormData(form);

    /* No form service wired up yet — hand it to their mail app instead. */
    if (form.action.indexOf("YOUR_FORM_ID") !== -1) {
      var body =
        "Name: " + data.get("name") + "\n" +
        "Email: " + data.get("email") + "\n\n" +
        data.get("message");
      window.location.href =
        "mailto:" + EMAIL +
        "?subject=" + encodeURIComponent("Message from " + data.get("name")) +
        "&body=" + encodeURIComponent(body);
      setStatus("Opening your email app with the message ready to send.");
      return;
    }

    submit.disabled = true;
    setStatus("Sending...");

    fetch(form.action, { method: "POST", body: data, headers: { Accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed");
        form.reset();
        setStatus("Sent. Thanks — I'll get back to you.", "ok");
      })
      .catch(function () {
        setStatus("That did not send. You can email me instead.", "bad");
      })
      .finally(function () {
        submit.disabled = false;
      });
  });
})();
