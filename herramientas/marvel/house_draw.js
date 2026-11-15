// House estilo serie animada (busto, coordenadas de lienzo 1080x1920)
const L = '#15121a';
const C = { skin: '#e2aa86', skinS: '#b97c5f', skinD: '#8f5a45', rim: '#f8d6ba', hair: '#5b4636', hairS: '#3a2b21', hairH: '#8a6b53', gray: '#a09a92', blz: '#3b3d46', blzS: '#26272d', blzR: '#6a6f7c', shirt: '#86a4d2', shirtS: '#5a77a6', eye: '#4f88c8' };
const p = (d, fill, w = 5, extra = '') => `<path d="${d}" fill="${fill}" stroke="${L}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
const f = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const ln = (d, w = 5, col = L, extra = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
export function houseSVG() {
let ch = '';
// ---------- cuerpo: saco, camisa
ch += p('M230 1920 C220 1500 230 1200 290 1080 C340 1030 420 1010 505 985 L700 990 C780 1010 850 1040 880 1100 C920 1300 920 1600 910 1920 Z', C.blz, 7);
ch += `<g clip-path="url(#blzC)">` + f('M700 990 C780 1010 850 1040 880 1100 C920 1300 920 1600 910 1920 L760 1920 C780 1600 770 1300 740 1150 C730 1080 715 1030 700 990 Z', C.blzS) + f('M300 1080 C260 1180 250 1400 248 1920 L232 1920 C224 1500 232 1220 290 1080 Z', C.blzR) + `</g>`;
// camisa celeste y cuello abierto
ch += p('M505 985 L520 1000 C560 1100 590 1250 600 1920 L652 1920 L655 1080 L690 990 C650 1012 560 1003 505 985 Z', C.shirt, 5);
ch += f('M600 1100 C612 1250 618 1500 622 1920 L652 1920 L655 1080 Z', C.shirtS);
ch += p('M505 985 L462 1070 L548 1058 Z', '#9db8e0', 4) + p('M690 988 L728 1058 L652 1046 Z', '#7f9cc8', 4);
// solapas del saco
ch += p('M505 990 L430 1090 L520 1230 L590 1920', 'none', 6) + p('M700 995 L760 1100 L680 1230 L655 1920', 'none', 6);
ch += ln('M455 1300 L470 1520', 3, C.blzR) + ln('M840 1260 L850 1500', 3, '#4a4d57');
// ---------- cuello
ch += p('M520 880 L515 1000 C560 1012 650 1012 692 995 L676 790 Z', C.skin, 6);
ch += f('M560 905 C600 905 640 880 668 845 L686 995 C650 1008 600 1010 560 1005 Z', C.skinS) + f('M520 905 C540 940 600 950 640 930 L650 960 C600 975 545 965 518 945 Z', C.skinD, 'opacity=".55"');
// ---------- oreja
let body = ch; ch = '';
ch += p('M662 712 C690 698 712 728 704 762 C698 790 678 802 662 794 Z', C.skin, 5) + ln('M676 726 C690 734 692 756 680 772', 3.5, C.skinD);
// ---------- cara
ch += `<use href="#faceP" fill="${C.skin}" stroke="${L}" stroke-width="7"/>`;
ch += `<g clip-path="url(#faceC)">`;
ch += f('M560 735 C600 760 615 800 640 840 L668 800 L676 700 C640 720 600 728 560 735 Z', C.skinS);           // sombra mejilla
ch += f('M612 860 C640 840 660 818 668 798 L690 900 L600 930 Z', C.skinD, 'opacity=".6"');                         // sombra mandíbula
ch += f('M425 600 C470 620 560 625 650 600 L700 620 L700 560 L420 560 Z', C.skinS);                               // sombra bajo el pelo
ch += f('M412 700 C405 740 408 775 418 800 L424 800 C416 770 414 740 420 705 Z', C.rim, 'opacity=".9"');            // luz de borde
// barba de pocos días
ch += f('M420 812 C428 860 450 900 480 914 C525 918 580 900 620 872 C645 852 660 828 668 800 C630 820 600 830 562 822 C540 832 520 824 500 816 C470 820 445 812 420 812 Z', '#6e5242', 'opacity=".38"');
let dots = ''; for (let k = 0; k < 260; k++) { const a = (k * 137.508) % 360 * Math.PI / 180, r = Math.sqrt((k * 7919 % 1000) / 1000); const x = 545 + Math.cos(a) * r * 125, y = 865 + Math.sin(a) * r * 55; if (y > 818 && x > 425) dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6" fill="#3e2c22" opacity=".55"/>`; } ch += dots;
ch += `</g>`;
// ojos (3/4: el lejano más angosto)
ch += p('M432 702 Q448 690 468 698 Q452 712 436 708 Z', '#f4eee6', 3.5) + `<circle cx="452" cy="703" r="6.5" fill="${C.eye}"/><circle cx="452" cy="703" r="3" fill="${L}"/>` + ln('M428 698 Q448 686 472 696', 6);
ch += p('M508 700 Q540 686 576 698 Q545 716 512 708 Z', '#f6f0e8', 3.5);
ch += `<clipPath id="eyeN"><path d="M508 700 Q540 686 576 698 Q545 716 512 708 Z"/></clipPath><g clip-path="url(#eyeN)"><circle cx="536" cy="703" r="11" fill="${C.eye}"/><circle cx="536" cy="703" r="4.5" fill="${L}"/><circle cx="532" cy="699" r="2.4" fill="#fff"/><rect x="500" y="684" width="80" height="12" fill="${C.skinS}"/></g>`;
ch += ln('M504 697 Q540 684 580 696', 7) + ln('M512 722 Q545 732 576 718', 3, C.skinD) + ln('M506 680 Q540 668 574 676', 3, C.skinS);
// cejas (una levantada)
ch += f('M418 664 Q440 648 470 654 L468 662 Q442 658 420 670 Z', C.hairS, `stroke="${L}" stroke-width="2"`);
ch += f('M498 652 Q536 626 586 640 L584 650 Q538 640 500 662 Z', C.hairS, `stroke="${L}" stroke-width="2"`);
ch += ln('M440 640 Q470 632 500 636 M462 624 Q492 616 520 620', 2.6, C.skinS);                                  // arrugas de frente
// nariz larga
ch += f('M488 706 C496 740 508 770 504 792 L486 800 C492 776 486 740 484 708 Z', C.skinS);
ch += ln('M486 692 C482 728 470 762 456 790 C462 802 478 806 494 798', 5.5) + ln('M500 796 C508 792 512 786 510 778', 4, C.skinD);
ch += ln('M506 806 Q528 832 532 860', 3.5, C.skinD);                                                               // surco nasogeniano
// boca: fina, gesto serio con media mueca
ch += ln('M452 846 Q482 838 518 846 L530 852', 5.5) + ln('M468 866 Q492 872 514 864', 3.5, C.skinD) + ln('M522 842 l10 -6', 3, L);
// ---------- pelo despeinado
ch += p('M425 600 C405 560 425 498 490 474 C562 446 652 466 704 518 C734 552 740 612 714 662 C704 684 694 700 686 706 L672 700 C676 664 664 632 642 614 C626 640 604 600 578 614 C562 590 534 604 512 590 C490 608 466 590 448 608 C440 602 432 606 425 600 Z', C.hair, 7);
ch += f('M640 500 C700 520 735 580 712 662 C700 686 692 700 686 706 L672 700 C676 664 664 632 642 614 C660 590 662 540 640 500 Z', C.hairS);
ch += f('M672 640 C684 662 686 690 680 704 L668 700 C672 680 670 662 662 648 Z', C.gray);
ch += f('M470 500 C520 476 580 474 620 488 C580 486 530 492 486 512 Z', C.hairH);
// mechones cortos despeinados (integrados al contorno)
ch += p('M452 520 C470 488 500 470 520 478 C530 456 570 452 590 468 C610 454 650 466 660 490 C680 492 700 510 704 530 C690 515 670 508 652 512 C640 494 612 486 596 496 C580 480 548 482 532 500 C512 492 480 500 452 520 Z', C.hair, 0);
ch += ln('M452 520 C470 488 500 470 520 478 C530 456 570 452 590 468 C610 454 650 466 660 490 C680 492 700 510 704 530', 7);
ch += ln('M470 560 C500 540 540 548 560 530 M590 560 C620 548 650 560 668 590 M520 600 C540 585 560 590 575 580', 3.5, C.hairS);
return `<defs><clipPath id="faceC"><path id="faceP" d="M432 575 C418 610 408 640 411 658 C420 675 420 690 414 708 C400 735 405 760 414 785 C420 815 426 840 434 862 C440 885 452 905 478 914 C520 918 575 900 618 872 C645 850 662 825 668 798 L676 700 L700 640 C690 560 600 520 520 530 C470 535 440 555 432 575 Z"/></clipPath>
 <clipPath id="blzC"><path d="M230 1920 C220 1500 230 1200 290 1080 C340 1030 420 1010 505 985 L700 990 C780 1010 850 1040 880 1100 C920 1300 920 1600 910 1920 Z"/></clipPath></defs>` + body + `<g transform="translate(560 930) scale(1.2) translate(-560 -890)">${ch}</g>`;
}
