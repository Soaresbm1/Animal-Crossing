/** Original SVG artwork, scalable without external images or fonts. */
export function Tree({ className = '' }: { className?: string }) {
  return <span className={`scene-tree ${className}`} aria-hidden="true"><svg viewBox="0 0 150 180">
    <ellipse cx="89" cy="164" rx="48" ry="12" fill="#294e422a" />
    <path d="M64 166L68 91H89L91 167Q78 174 64 166" fill="#876049" /><path d="M76 163L77 102M78 134L100 115M74 121L55 109" stroke="#bc9060" strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d="M22 110C-4 95 10 66 24 59C20 30 44 23 58 25C73 0 106 13 112 36C144 32 153 66 138 84C157 119 119 141 99 132C73 152 46 136 43 127C28 130 17 122 22 110" fill="#356f52" />
    <path d="M22 91C7 74 32 52 43 60C29 28 58 21 72 34C86 14 120 34 113 56C145 51 147 88 122 96C106 119 76 103 69 113C46 129 18 113 22 91" fill="#589660" />
    <path d="M38 65Q43 42 63 49M72 40Q88 29 100 43M96 72Q113 60 125 75M38 91Q48 84 56 91" fill="none" stroke="#8fb974" strokeWidth="10" strokeLinecap="round" />
    <path d="M26 104Q42 124 62 116M89 120Q111 127 128 109" fill="none" stroke="#2b604c" strokeWidth="5" strokeLinecap="round" />
    {[[42,78],[106,94],[84,60]].map(([x,y]) => <g key={x}><path d={`M${x} ${y}q0 -8 5 -11`} stroke="#654b35" strokeWidth="3" fill="none" /><circle cx={x} cy={y+5} r="8" fill="#db7959" /><circle cx={x-2} cy={y+2} r="3" fill="#f4af72" /></g>)}
  </svg></span>
}

export function House() {
  return <span className="scene-house" aria-label="Maison"><svg viewBox="0 0 280 230">
    <ellipse cx="151" cy="210" rx="119" ry="17" fill="#254d4025" /><path d="M45 100H238V197Q146 222 45 197Z" fill="#d1b896" /><path d="M48 102H223V191Q139 210 48 191Z" fill="#f8e9c8" />
    <path d="M55 173H219M55 183H219" stroke="#e2cba4" strokeWidth="2" /><path d="M19 108L61 39H215L263 108Q148 132 19 108" fill="#694f48" /><path d="M19 98L63 29H213L264 98Q143 123 19 98" fill="#b96d58" />
    {[46,62,78,94].map(y=><path key={y} d={`M${62-(y-29)*.63} ${y}Q143 ${y+15} ${214+(y-29)*.72} ${y}`} fill="none" stroke="#df9b74" strokeWidth="3"/>)}
    <path d="M103 103L142 57L182 104Z" fill="#805846" /><path d="M111 104L142 70L174 105Z" fill="#f5e3bd" /><circle cx="142" cy="94" r="10" fill="#467568" stroke="#c19465" strokeWidth="4" />
    <path d="M204 61V20H226V83" fill="#bd9671" /><path d="M201 21H230V13H201Z" fill="#f1d4ad" /><path d="M118 198V144Q141 122 163 144V198" fill="#aa855f" /><path d="M124 198V146Q142 131 158 146V198" fill="#3d7567" /><path d="M134 146V193M145 143V193" stroke="#77a38b" strokeWidth="2" /><circle cx="152" cy="171" r="3" fill="#f7c768" />
    {[65,180].map(x=><g key={x}><rect x={x} y="132" width="34" height="37" rx="13" fill="#63897a" stroke="#ba9d71" strokeWidth="5"/><path d={`M${x+17} 134V167M${x+2} 150H${x+31}`} stroke="#fff4d4" strokeWidth="3"/><path d={`M${x+4} 136L${x+12} 136L${x+4} 156Z`} fill="#b1d5ce"/><rect x={x-4} y="170" width="42" height="10" rx="3" fill="#a16d4d"/><path d={`M${x} 170q2 -12 10 -6q9 -18 16 0q9 -7 12 6`} fill="#6b935a"/><circle cx={x+9} cy="163" r="4" fill="#f3b4a0"/><circle cx={x+25} cy="160" r="4" fill="#edd395"/></g>)}
    <path d="M110 201H170L182 213H97Z" fill="#d1bea0" /><path d="M100 214H181" stroke="#b29879" strokeWidth="4" /><path d="M52 109V192M221 111V191" stroke="#fff5dc" strokeWidth="6"/>
  </svg></span>
}

export function CharacterArt({ resident = false }: { resident?: boolean }) {
  return <svg viewBox="0 0 80 110" aria-hidden="true">
    <ellipse cx="43" cy="101" rx="26" ry="7" fill="#234f422d" /><path d="M26 82L25 101H37L39 84M43 84L45 101H58L54 80" fill="#544c43" /><path d="M24 102H37M46 102H59" stroke="#d7bd8c" strokeWidth="5" strokeLinecap="round" />
    <path d="M20 62Q8 72 17 84L25 76M59 62Q72 70 64 84L57 75" fill="#e7b48e" /><path d="M23 58Q40 50 58 58L61 87Q39 95 19 86Z" fill={resident ? '#75967a' : '#cd785a'} /><path d="M28 59L33 90M51 58L49 90" stroke={resident ? '#e9d8aa' : '#e9a879'} strokeWidth="4" />
    {resident && <path d="M27 72H54V86H27Z" fill="#eee0b8" />}
    <ellipse cx="40" cy="36" rx="26" ry="27" fill="#62483b" /><ellipse cx="40" cy="42" rx="23" ry="23" fill="#e9b38d" /><path d="M16 36Q11 8 39 8Q65 6 66 38L57 33L52 22Q43 39 17 31Z" fill="#594536" />
    <ellipse cx="31" cy="43" rx="2.5" ry="3.5" fill="#493c32" /><ellipse cx="49" cy="43" rx="2.5" ry="3.5" fill="#493c32" /><path d="M36 53Q40 57 44 53" stroke="#955c47" strokeWidth="2" strokeLinecap="round" fill="none" /><ellipse cx="24" cy="51" rx="5" ry="3" fill="#d78775" opacity=".65"/><ellipse cx="56" cy="51" rx="5" ry="3" fill="#d78775" opacity=".65"/>
    {resident ? <g><path d="M17 20Q22 -2 47 3Q60 5 63 24Z" fill="#d7b679"/><ellipse cx="40" cy="23" rx="37" ry="8" fill="#ead098"/><path d="M18 18Q39 24 60 19" fill="none" stroke="#7c9977" strokeWidth="5"/><circle cx="57" cy="20" r="5" fill="#f3ecd6"/></g> : <g><path d="M19 16Q27 1 49 7Q64 10 64 25L20 25Z" fill="#739481"/><path d="M16 23Q36 29 63 23L71 28Q54 35 37 29" fill="#456f61"/><path d="M54 65L66 68V85L54 88Z" fill="#d7b467"/></g>}
  </svg>
}

export function Player({ x, y, indoors }: { x: number; y: number; indoors: boolean }) {
  return <span className={`player ${indoors ? 'player--indoors' : ''}`} style={{ left: `${x}%`, top: `${y}%` }} aria-label="Votre personnage" data-testid="player" data-x={x.toFixed(2)} data-y={y.toFixed(2)}><CharacterArt /></span>
}

export function Landscape() {
  return <svg className="illustrated-landscape" viewBox="0 0 1000 800" preserveAspectRatio="none" aria-hidden="true">
    <defs><radialGradient id="meadow"><stop stopColor="#b4c886"/><stop offset="1" stopColor="#7fa979"/></radialGradient><pattern id="meadow-grain" width="47" height="39" patternUnits="userSpaceOnUse"><path d="M8 16l-2 -4m2 4l3 -5M32 30l-2 -3m2 3l3 -4" stroke="#476e4d" strokeWidth="1.2" opacity=".2"/><circle cx="22" cy="8" r="1.3" fill="#e2dfad" opacity=".6"/></pattern></defs>
    <path d="M115 246Q178 37 428 49Q707 -8 869 162Q1010 345 888 607Q824 774 568 760Q251 804 112 637Q-13 452 115 246" fill="#d4eee1" opacity=".38"/>
    <path d="M121 246Q193 66 430 67Q719 21 854 184Q972 352 867 606Q814 747 568 737Q254 780 126 625Q15 451 121 246" fill="#a99871"/>
    <path d="M121 230Q193 50 430 51Q719 5 854 168Q972 336 867 590Q814 731 568 721Q254 764 126 609Q15 435 121 230" fill="#e4cda0"/>
    <path d="M143 230Q213 79 433 78Q698 32 831 184Q937 338 842 572Q788 697 568 692Q274 731 149 585Q49 425 143 230" fill="url(#meadow)"/>
    <path d="M143 230Q213 79 433 78Q698 32 831 184Q937 338 842 572Q788 697 568 692Q274 731 149 585Q49 425 143 230" fill="url(#meadow-grain)"/>
    <path d="M500 181Q450 298 497 405Q564 527 497 710M496 329Q595 330 691 235" fill="none" stroke="#c8bb8e" strokeWidth="48" strokeLinecap="round"/><path d="M500 181Q450 298 497 405Q564 527 497 710M496 329Q595 330 691 235" fill="none" stroke="#e2cf9f" strokeWidth="35" strokeLinecap="round"/>
    {[0,1,2,3,4].map(i=><g key={i} transform={`translate(${465+i%2*10} ${265+i*55}) rotate(${i*7-10})`}><ellipse rx="13" ry="7" fill="#c4b58c" opacity=".6"/><ellipse cy="-2" rx="11" ry="6" fill="#eee0bc"/></g>)}
    <g transform="translate(485 710)"><path d="M0 0L-10 83H82L65 0" fill="#7c6954"/>{[0,1,2,3,4,5].map(i=><path key={i} d={`M-5 ${i*13}H74`} stroke="#c49d6d" strokeWidth="10"/>)}<path d="M-5 -9V91M75 -9V91" stroke="#806447" strokeWidth="7"/><circle cx="-5" cy="-9" r="6" fill="#edd1a1"/><circle cx="75" cy="-9" r="6" fill="#edd1a1"/></g>
    {[[180,430],[300,280],[770,520],[365,600],[740,290],[660,620],[190,530],[340,160]].map(([x,y])=><g key={x} transform={`translate(${x} ${y})`}><path d="M-8 4Q-17 -8 -7 -9Q-5 -23 3 -12Q18 -18 15 -5Q28 9 5 11Z" fill="#688b60"/><circle cx="-3" cy="-5" r="3" fill="#efd9ad"/><circle cx="9" cy="2" r="3" fill="#f2dfba"/></g>)}
    {[[82,318],[906,440],[259,711],[846,190]].map(([x,y])=><g key={x} transform={`translate(${x} ${y})`}><ellipse rx="15" ry="9" fill="#557e772c"/><path d="M-14 0L-9 -13L4 -17L15 -6L13 1Z" fill="#a5b5a4"/><path d="M-9 -13L4 -17L0 -5L-14 0Z" fill="#c7d0b7"/></g>)}
  </svg>
}
