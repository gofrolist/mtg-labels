export function Footer() {
  return (
    <footer className="py-4 border-t border-mtg-border bg-mtg-section-bg mt-auto">
      <div className="container mx-auto px-4 text-center text-sm text-mtg-text-muted leading-relaxed">
        <p>
          MTG Printable Label Generator is unofficial Fan Content permitted under the{' '}
          <a
            href="https://company.wizards.com/en/legal/fancontentpolicy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-mtg-accent underline"
          >
            Fan Content Policy
          </a>
          . Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards
          of the Coast. &copy;Wizards of the Coast LLC. Set information provided by{' '}
          <a
            href="https://scryfall.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-mtg-accent underline"
          >
            Scryfall
          </a>{' '}
          per their{' '}
          <a
            href="https://scryfall.com/docs/api#use-of-scryfall-data"
            target="_blank"
            rel="noopener noreferrer"
            className="text-mtg-accent underline"
          >
            usage guidelines
          </a>
          .
        </p>
      </div>
    </footer>
  )
}
