import sprite from '../../assets/icons.svg?url';

/** Identifiants du sprite du kit (assets/icons.svg, copie de maquettes/web/icons.svg + « moon »). */
export type IconName =
  | 'logo' | 'home' | 'parcel' | 'calendar' | 'chat' | 'leaf-scan' | 'cloud-sun' | 'market' | 'gift' | 'users' | 'id-card' | 'satellite'
  | 'scale' | 'bell' | 'mail' | 'clipboard' | 'shield-check' | 'user' | 'megaphone' | 'send' | 'file-text' | 'list-check' | 'wheat' | 'flag'
  | 'dashboard' | 'chart-bar' | 'trend' | 'user-cog' | 'download' | 'upload' | 'book' | 'microscope' | 'languages' | 'scroll' | 'coins'
  | 'network' | 'truck' | 'tag' | 'building' | 'warehouse' | 'search' | 'plus' | 'minus' | 'edit' | 'trash' | 'filter' | 'sort' | 'sort-asc'
  | 'sort-desc' | 'chevron-down' | 'chevron-up' | 'chevron-right' | 'chevron-left' | 'arrow-left' | 'arrow-right' | 'arrow-up' | 'arrow-down'
  | 'x' | 'menu' | 'check' | 'check-circle' | 'alert' | 'info' | 'x-circle' | 'clock' | 'wifi-off' | 'wifi' | 'sync' | 'cloud-upload' | 'globe'
  | 'logout' | 'settings' | 'eye' | 'eye-off' | 'more' | 'camera' | 'image' | 'phone' | 'map-pin' | 'external' | 'sidebar' | 'mic' | 'qr'
  | 'printer' | 'copy' | 'help' | 'lock' | 'drop' | 'sun' | 'sprout' | 'layers' | 'target' | 'zoom-in' | 'zoom-out' | 'paperclip' | 'history'
  | 'wallet' | 'moon';

/** Adresse d'un symbole du sprite, pour un <svg> sans la classe .ic (le logo garde ses propres couleurs). */
export const spriteHref = (name: IconName) => `${sprite}#i-${name}`;

/** Icône du sprite. Décorative par défaut (aria-hidden) ; passer `label` si elle porte seule le sens. */
export function Icon({ name, size, label, className = '' }: { name: IconName; size?: 'sm' | 'lg'; label?: string; className?: string }) {
  const cls = `ic${size ? ` ic--${size}` : ''}${className ? ` ${className}` : ''}`;
  return (
    <svg className={cls} aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label} focusable="false">
      <use href={spriteHref(name)} />
    </svg>
  );
}
