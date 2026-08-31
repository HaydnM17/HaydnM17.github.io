/* Haydn McIntyre site behaviour. No dependencies. */
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

  /* ---- Hero particle web -------------------------------------------------
     Drifting dots that are gathered in from a distance and then held in a
     ring orbiting the pointer, never landing on it. Straight hairlines link
     dots to each other, never to the pointer, and no link is allowed to cross
     the middle of the ring, so the cursor sits in open space. */
  (function () {
    var canvas = document.getElementById("hero-canvas");
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext("2d");
    var w = 0, h = 0, dpr = 1;
    var running = false, frame = 0, last = 0;
    var dots = [];

    var REACH = 300;   // how far the pointer's influence carries
    var DRAW = 300;    // px/s2 of inward pull, what gathers them in
    var SWIRL = 220;   // px/s2 of rotation around the pointer
    var TAPER = 32;    // spin eases off inside this, so the middle stays sane
    var ORBIT = 34;    // inside this they are pushed back out, so a ring holds
    var CLEAR = 1500;  // px/s2 shoving them back out, hardest at the centre
    var LINK = 90;     // two dots closer than this can be linked
    var GAP = 26;      // no link may pass this close to the pointer

    var cursor = { x: 0, y: 0, on: false };
    var glow = document.getElementById("hero-cursor");

    var rand = function (min, max) { return min + Math.random() * (max - min); };

    var build = function () {
      var count = Math.round((w * h) / 13500);
      count = Math.max(28, Math.min(count, 88));

      dots = [];
      for (var i = 0; i < count; i++) {
        /* Size drives the rest, so the field reads as having some depth: the
           bigger ones drift slower and lean on the pointer a little less, the
           small ones scurry and swing wider. */
        var r = rand(1.2, 3);
        var weight = (r - 1.2) / 1.8;        // 0 for the smallest, 1 for the biggest
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          bvx: rand(-11, 11) * (1.45 - weight * 0.75),   // base drift, px/sec
          bvy: rand(-9, 9) * (1.45 - weight * 0.75),
          ivx: 0,               // pointer-induced velocity, decays away
          ivy: 0,
          lit: 0,               // eased 0..1 nearness to the pointer
          pull: 1.14 - weight * 0.26,        // heavier ones ride a wider, slower orbit
          r: r
        });
      }
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

    var paint = function (dt) {
      ctx.clearRect(0, 0, w, h);

      var damp = Math.exp(-2.2 * dt); // lean bleeds off once you move away
      var i, j, a, b, dx, dy, d;

      for (i = 0; i < dots.length; i++) {
        a = dots[i];

        var target = 0;
        if (cursor.on) {
          dx = cursor.x - a.x;
          dy = cursor.y - a.y;
          d = Math.sqrt(dx * dx + dy * dy);
          if (d < REACH && d > 0.001) {
            target = 1 - d / REACH;
            /* Sideways, which is what makes them go round rather than in. The
               taper stops the innermost ones whipping about at silly speed. */
            var force = SWIRL * target * Math.min(d / TAPER, 1) * a.pull;
            a.ivx += (-dy / d) * force * dt;
            a.ivy += (dx / d) * force * dt;

            /* Inward out at range, outward once inside ORBIT. The two cancel
               at one radius, so dots gather from a long way off and settle
               into a ring there instead of drifting past or piling on. */
            var radial = DRAW * target;
            if (d < ORBIT) radial -= CLEAR * (1 - d / ORBIT);
            radial *= a.pull;
            a.ivx += (dx / d) * radial * dt;
            a.ivy += (dy / d) * radial * dt;
          }
        }
        a.lit += (target - a.lit) * Math.min(dt * 5, 1);

        a.ivx *= damp;
        a.ivy *= damp;
        a.x += (a.bvx + a.ivx) * dt;
        a.y += (a.bvy + a.ivy) * dt;

        /* wrap, so the field never thins out at an edge */
        if (a.x < -20) a.x = w + 20; else if (a.x > w + 20) a.x = -20;
        if (a.y < -20) a.y = h + 20; else if (a.y > h + 20) a.y = -20;
      }

      /* straight hairlines between neighbours, brightest near the pointer */
      ctx.lineWidth = 1;
      for (i = 0; i < dots.length; i++) {
        a = dots[i];
        for (j = i + 1; j < dots.length; j++) {
          b = dots[j];
          dx = a.x - b.x;
          dy = a.y - b.y;
          var d2 = dx * dx + dy * dy;
          if (d2 > LINK * LINK) continue;

          d = Math.sqrt(d2);
          var near = Math.max(a.lit, b.lit);
          var alpha = (1 - d / LINK) * (0.045 + near * 0.42);
          if (alpha < 0.012) continue;

          /* Dots opposite each other in the ring would otherwise be joined by
             a line straight through the pointer. Drop any link that passes
             within GAP of it, so the middle stays open. */
          if (cursor.on) {
            var vx = b.x - a.x, vy = b.y - a.y;
            var along = ((cursor.x - a.x) * vx + (cursor.y - a.y) * vy) / d2;
            along = along < 0 ? 0 : along > 1 ? 1 : along;
            var gx = a.x + along * vx - cursor.x;
            var gy = a.y + along * vy - cursor.y;
            if (gx * gx + gy * gy < GAP * GAP) continue;
          }

          ctx.strokeStyle = near > 0.3
            ? "rgba(229, 180, 87, " + alpha.toFixed(3) + ")"
            : "rgba(236, 241, 236, " + alpha.toFixed(3) + ")";
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (i = 0; i < dots.length; i++) {
        a = dots[i];
        ctx.fillStyle = a.lit > 0.32
          ? "rgba(229, 180, 87, " + (0.45 + a.lit * 0.5).toFixed(3) + ")"
          : "rgba(236, 241, 236, 0.42)";
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r * (1 + a.lit * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    var step = function (t) {
      var dt = Math.min((t - last) / 1000, 0.05); // clamp after a tab switch
      last = t;
      paint(dt);
      if (running) frame = requestAnimationFrame(step);
    };

    /* reduced motion: one still frame, no drift and no pointer response */
    var still = function () { paint(0); };

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
    if (reduceMotion) { still(); } else { go(); }

    /* ---- Pointer ----------------------------------------------------------
       The canvas is pointer-events:none so it never eats clicks, so track on
       the window and translate into canvas space. */
    if (!reduceMotion) {
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

      var clear = function () {
        cursor.on = false;
        if (glow) glow.classList.remove("on");
      };

      window.addEventListener("pointermove", track, { passive: true });
      window.addEventListener("pointerdown", track, { passive: true });
      /* only a finger lifting ends it, a mouse click should not */
      window.addEventListener("pointerup", function (e) {
        if (e.pointerType === "touch") clear();
      }, { passive: true });
      window.addEventListener("pointercancel", clear, { passive: true });
      document.addEventListener("pointerleave", clear);
      window.addEventListener("scroll", clear, { passive: true });
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
    /* nav links carry data-sec so Home and Portfolio can highlight too,
       not just the ones whose href is a hash on this page */
    var navLinks = Array.prototype.slice.call(
      document.querySelectorAll(".nav a[data-sec]")
    );

    var setActive = function (id) {
      links.forEach(function (a) {
        a.classList.toggle("is-active", a.getAttribute("data-sec") === id);
      });
      navLinks.forEach(function (a) {
        a.classList.toggle("is-current", a.getAttribute("data-sec") === id);
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
      /* Positive bottom margin fires the reveal while the element is still
         below the fold, so by the time it scrolls into view it has already
         played. A negative one waited until it was well inside the viewport,
         which read as the section loading late. */
      { rootMargin: "0px 0px 22% 0px", threshold: 0 }
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

  /* Used by the spam trap in the endpoint: a real person cannot fill this in
     and submit within two seconds of the page loading. */
  var openedAt = Date.now();

  /* Last resort when the endpoint is missing or unreachable. The message the
     visitor typed is never thrown away, it just goes out through their own
     mail app instead. */
  var handOffToMailApp = function (data, note) {
    var body =
      "Name: " + data.name + "\n" +
      "Email: " + data.email + "\n\n" +
      data.message;
    window.location.href =
      "mailto:" + EMAIL +
      "?subject=" + encodeURIComponent("Message from " + data.name) +
      "&body=" + encodeURIComponent(body);
    setStatus(note || "Opening your email app with the message ready to send.");
  };

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) {
      setStatus("Check the highlighted fields.", "bad");
      return;
    }

    var fields = new FormData(form);
    var data = {
      name: String(fields.get("name") || "").trim(),
      email: String(fields.get("email") || "").trim(),
      message: String(fields.get("message") || "").trim(),
      _gotcha: fields.get("_gotcha") || "",
      _t: openedAt
    };

    submit.disabled = true;
    setStatus("Sending...");

    fetch(form.action, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        if (res.ok) {
          form.reset();
          setStatus("Sent. Thanks, I will get back to you.", "ok");
          return;
        }
        /* 501 means the endpoint is live but no mail provider is configured. */
        if (res.status === 501) {
          handOffToMailApp(data);
          return;
        }
        setStatus("That did not send. You can email me instead.", "bad");
      })
      .catch(function () {
        /* No endpoint at all: opened as a local file, or the network is down. */
        handOffToMailApp(data, "Could not reach the server. Opening your email app instead.");
      })
      .finally(function () {
        submit.disabled = false;
      });
  });
})();
