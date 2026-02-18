export function Footer() {
  return (
    <footer className="py-4 border-t border-mtg-border bg-mtg-section-bg mt-auto">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <p className="mb-2 text-sm text-mtg-text-muted leading-relaxed">
            MTG Printable Label Generator is unofficial Fan Content permitted under the Fan
            Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are
            property of Wizards of the Coast. ©Wizards of the Coast LLC.
          </p>
          <p className="mb-2 text-sm text-mtg-text-muted leading-relaxed">
            <a
              href="https://company.wizards.com/en/legal/fancontentpolicy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mtg-accent underline"
            >
              View the full Fan Content Policy
            </a>
            .
          </p>
          <p className="mb-0 text-sm text-mtg-text-muted leading-relaxed">
            It uses set information provided by{' '}
            <a
              href="https://scryfall.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mtg-accent underline"
            >
              Scryfall
            </a>{' '}
            in accordance with their{' '}
            <a
              href="https://scryfall.com/docs/api#use-of-scryfall-data"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mtg-accent underline"
            >
              guidelines
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  )
}
