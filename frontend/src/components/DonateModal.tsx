interface DonateModalProps {
  onClose: () => void
}

export function DonateModal({ onClose }: DonateModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-[500px] rounded-lg bg-mtg-card-bg border border-mtg-border shadow-xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-lg text-mtg-text">Thank You!</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-mtg-text-muted hover:text-mtg-text p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="text-center text-mtg-text mb-4 leading-relaxed">
          Your PDF is being generated. If you find this tool useful, consider supporting its
          development!
        </p>
        <div className="flex flex-wrap items-start justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium text-mtg-text-muted">PayPal</span>
            <form action="https://www.paypal.com/donate" method="post" target="_top">
              <input type="hidden" name="business" value="3ABRQKUCLUGXN" />
              <input type="hidden" name="no_recurring" value="0" />
              <input type="hidden" name="item_name" value="for buying more MTG cards :)" />
              <input type="hidden" name="currency_code" value="USD" />
              <button type="submit" className="border-0 bg-transparent p-0 cursor-pointer">
                <img
                  src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif"
                  alt="Donate with PayPal"
                  title="PayPal - The safer, easier way to pay online!"
                />
              </button>
            </form>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium text-mtg-text-muted">Venmo</span>
            <a
              href="https://venmo.com/evasilenko"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src="/venmo-qr.png"
                alt="Donate with Venmo @evasilenko"
                className="w-36 rounded"
              />
            </a>
            <span className="text-xs text-mtg-text-muted">@evasilenko</span>
          </div>
        </div>
      </div>
    </div>
  )
}
