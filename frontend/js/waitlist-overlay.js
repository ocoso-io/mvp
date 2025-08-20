  // Ziel-URL für die Registrierung
  const REG_URL =
    'https://secure.ocoso.io/realms/ocoso-network/protocol/openid-connect/registrations?client_id=ocoso-website&scope=openid%20profile&redirect_uri=https%3A%2F%2Fapp.ocoso.io%2Fwelcome.html&response_type=code';

  function openWaitlistOverlay(e){
    e?.preventDefault();

    Overlay.open({
      title: 'Waitlist Registration',
      html: `
        <h1>Become a Founding Member</h1>
        <div style="height: var(--px-40)">&nbsp;</div>
        <h4>We are preparing for launch. <br>But before we go live, we invite you to join with some</h4>
        <h2>special priviliges...</h2>
        <div style="height: var(--px-40)">&nbsp;</div>

        <p>
          ✔ <strong>Free lifetime access </strong>reserved only for early members.<br>
          ✔ <strong>Guaranteed token allocation </strong>secured in the first drop.<br>
          ✔ <strong>Contributor status </strong>recognized as part of the movement from day one.
        </p>

        <div style="height: var(--px-80)">&nbsp;</div>
        <h2>Register on our waitlist now.</h2>
        <h4>Spaces are limited, and priority goes to early sign-ups.</h4>

        <div style="height: var(--px-40)">&nbsp;</div>

        <h6>We guarantee...</h6>
        <div style="height: var(--px-1)">&nbsp;</div>
        <ul>
          <li class="text-body">Your registration data will be used <strong>exclusively to manage your membership</strong> and to notify you about updates related to OCOSO.</li>
          <li class="text-body">We will <strong>not share your data with third parties,</strong> nor use it for advertising partnerships or purposes outside the scope of your membership.</li>
          <li class="text-body">You consent to receive email communication from OCOSO<strong> strictly limited to information about your membership, project updates, and related benefits.</strong></li>
        </ul>

        <div style="height: var(--px-40)">&nbsp;</div>
        <p>Your trust is the foundation. Your data stays with us — <strong>transparent, protected, and only for the purpose you signed up for.</strong> By joining as a Founding Member, you confirm that you understand and agree.</p>

        <div style="height: var(--px-20)">&nbsp;</div>

        <!-- Consent -->
        <p>
          <label class="overlay-consent" style="display:flex;gap:.6rem;align-items:center;line-height:1.2;">
            <input type="checkbox" id="wlAgree">
            <span>I agree to the Terms and Privacy Policy.</span>
          </label>
        </p>

        <div style="height: var(--px-80)">&nbsp;</div>

        <section class="content-submission" style="display: flex; flex-direction: row; gap: var(--px-50);">
          <div>
            <h2>Register directly and earn all the benefits</h2>
          </div>
          <button id="wlSubmit" class="content-button" type="button" disabled aria-disabled="true">
            <img src="img/Arrow-black.png" alt="" class="content-button-icon"/>
            <span class="content-button-text">Put your name on the waitlist</span>
          </button>
        </section>
        <div style="height: var(--px-40)">&nbsp;</div>
      `
    });

    // Consent + Submit verdrahten
    const agree  = document.getElementById('wlAgree');
    const submit = document.getElementById('wlSubmit');
    if (!agree || !submit) return;

    const sync = () => {
      const on = !!agree.checked;
      submit.disabled = !on;
      submit.setAttribute('aria-disabled', String(!on));
    };
    agree.addEventListener('change', sync);
    sync();

    submit.addEventListener('click', (ev) => {
      if (submit.disabled) { ev.preventDefault(); return; }
      window.open(REG_URL, '_blank', 'noopener,noreferrer');
      Overlay.close?.();
    });

    // Enter auf Checkbox toggelt
    agree.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        agree.checked = !agree.checked;
        agree.dispatchEvent(new Event('change', { bubbles:true }));
      }
    });
  }

  // Trigger registrieren
  document.getElementById('openOverlayBtn')
    ?.addEventListener('click', openWaitlistOverlay);

  // Zusätzlich: alle Buttons mit aria-label="Register"
  document.querySelectorAll('.action-button[aria-label="Register"]')
    .forEach(btn => btn.addEventListener('click', openWaitlistOverlay));