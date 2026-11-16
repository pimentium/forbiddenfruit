/** Small grey line with the version: the date of the commit this build was made from (shown in the visitor's time zone). */
export function Footer() {
  const { commit, date } = __APP_VERSION__;
  const when = date && !Number.isNaN(Date.parse(date))
    ? new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '';
  return (
    <footer className="footer muted">
      {when || commit ? `Version ${when}${when && commit ? ' · ' : ''}${commit.slice(0, 7)}` : 'Development version'}
    </footer>
  );
}
