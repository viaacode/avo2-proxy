export interface GraphQlCollection {
	id: number;
	owner_id: string;
	organisation_id: string | null;
	type_id: number;
	title: string;
	lom_context_id: number | null;
	lom_classification_id: number | null;
	created_at: string;
	updated_at: string;
	is_public: boolean;
	publish_at: string | null;
	depublish_at: string | null;
	lom_keyword_id: number | null;
	lom_intendedenduserrole_id: number | null;
	external_id: string | null;
	description: string | null;
	collection_fragment_ids: number[] | null;
}

export const DUMMY_COLLECTIONS: GraphQlCollection[] = [
	{
		id: 1,
		owner_id: 'efcaceaa-acfa-1038-9abe-41fb20d806a4',
		organisation_id: '1',
		type_id: 3,
		title: 'minimal insert test',
		lom_context_id: null,
		lom_classification_id: null,
		created_at: '12/2/2019 13:12:32.318243+00',
		updated_at: '12/2/2019 13:12:32.318243+00',
		is_public: false,
		publish_at: null,
		depublish_at: null,
		lom_keyword_id: null,
		lom_intendedenduserrole_id: null,
		external_id: null,
		description: null,
		collection_fragment_ids: null,
	},
	{
		id: 2,
		owner_id: 'efcaceaa-acfa-1038-9abe-41fb20d806a4',
		organisation_id: '1',
		type_id: 3,
		title: 'minimal insert test',
		lom_context_id: null,
		lom_classification_id: null,
		created_at: '12/2/2019 13:12:33.72528+00',
		updated_at: '12/2/2019 13:12:33.72528+00',
		is_public: false,
		publish_at: null,
		depublish_at: null,
		lom_keyword_id: null,
		lom_intendedenduserrole_id: null,
		external_id: null,
		description: null,
		collection_fragment_ids: null,
	},
	{
		id: 3,
		owner_id: 'efcaceaa-acfa-1038-9abe-41fb20d806a4',
		organisation_id: '1',
		type_id: 3,
		title: 'minimal insert test',
		lom_context_id: null,
		lom_classification_id: null,
		created_at: '12/2/2019 13:12:35.291343+00',
		updated_at: '12/2/2019 13:12:35.291343+00',
		is_public: false,
		publish_at: null,
		depublish_at: null,
		lom_keyword_id: null,
		lom_intendedenduserrole_id: null,
		external_id: null,
		description: null,
		collection_fragment_ids: null,
	},
	{
		id: 4,
		owner_id: 'efcaceaa-acfa-1038-9abe-41fb20d806a4',
		organisation_id: '1',
		type_id: 3,
		title: 'minimal ok it works again',
		lom_context_id: null,
		lom_classification_id: null,
		created_at: '12/2/2019 13:12:47.518946+00',
		updated_at: '12/2/2019 13:12:47.518946+00',
		is_public: false,
		publish_at: null,
		depublish_at: null,
		lom_keyword_id: null,
		lom_intendedenduserrole_id: null,
		external_id: null,
		description: null,
		collection_fragment_ids: null,
	},
	{
		id: 1725151,
		owner_id: '7519df6a-ed47-1033-9340-93ee79608a9f',
		organisation_id: null,
		type_id: 3,
		title: 'Uitgeklaard: terrorisme',
		lom_context_id: null,
		lom_classification_id: null,
		created_at: '3/7/2018 09:02:31+00',
		updated_at: '3/7/2018 09:02:31+00',
		is_public: false,
		publish_at: null,
		depublish_at: null,
		lom_keyword_id: null,
		lom_intendedenduserrole_id: null,
		external_id: 'Z2kTqYelmeQjPcSfkuGtDfWG',
		description: "<p><strong><em>Deze collectie werd aangemaakt voor de KLAAR-aflevering 'Wat is terrorisme?’.&nbsp;</em></strong><strong><em>Het beeld- en geluidsmateriaal uit deze collectie kan gebruikt worden in de eerste en tweede graad van het secundair onderwijs.</em></strong></p>\n<p>&nbsp;</p>\n<p><strong>KLAAR: WAT IS TERRORISME?<br></strong>FRAGMENT 1</p>\n<p>Wat is terrorisme? Bijna elke dag kan je in het nieuws iets horen over terrorisme, terroristen of aanslagen ergens in de wereld. Het lijkt alsof terrorisme overal is.</p> \n<p>Moeten we er dan bang voor zijn, of net niet? En wat is het eigenlijk precies? Yousri vraagt het aan VRT NWS-expert Steven Decraene.</p> <p> </p>\n<p>\n</p>\n<p><strong>22/03/2016: DE AANSLAGEN IN BRUSSEL<br></strong>FRAGMENT 2</p>\n<p>Ga even terug naar 22 maart 2016 met deze nieuwsspecial naar aanleiding van de aanslagen in Zaventem en Brussel, gepresenteerd door Martine Tanghe en Lieven Van Gils.</p>\n<p>00:00:00 Gesprek met de verschillende studiogasten.<br><br><em>De studiogasten zijn minister van Binnenlandse Zaken Jan Jambon, minister van Justitie Koen Geens, voorzitter van het Davidsfonds Norbert D'Hulst, journalist Phil Van Den Bossche, choreograaf Ish Ait Hamou, VRT-journaliste Caroline Van Den Berghe, VRT-journalist Rudi Vranckx, imam Sulayman Van Ael, gemeenteraadslid van MR Elsene Assita Kanko, traumapsycholoog van de brandweer Eric de Soir, psychiater Dirk De Wachter, zanger Bart Peeters, minister van Onderwijs Hilde Crevits en vice-premier Alexander De Croo.<br><br></em>00:24:14 Een gesprek met Ish Ait Hamou.<br>00:26:59 De getuigenis van Tatyana Beloy.<br>00:42:30 Een gesprek met voormalig imam Sulayman Van Ael.<br>00:48:30 Debat met gemeenteraadslid van MR Elsene Assita Kanko.<br>01:01:46 Gesprek met traumapsycholoog van de brandweer Eric de Soir.<br>01:07:00 Gesprek met Bart Peeters.<br>00:14:03 Korte reportage over een geschrapte schooluitstap en de reactie van minister van Onderwijs Hilde Crevits.<br>01:25:00 Een liedje van Bart Peeters.<br>01:30:17 Gesprek met vice-premier Alexander De Croo.<br>01:44:05 Beelden van het Beursplein dinsdagavond.</p>\n<p>&nbsp;</p>\n<p><strong>DE IMPACT VAN TERREUR <br></strong>FRAGMENT 3</p>\n<p>In deze aflevering van de human-interestreeks De klas gaat Erik Van Looy met de leerlingen in gesprek over geweld.</p>\n<p>Is de leefwereld van jongeren harder en gewelddadiger geworden dan in Eriks jeugd? En welke impact heeft de terreurdreiging op ons leven?</p>\n<p>&nbsp;</p>\n<p><strong>ISLAM EN TERRORISME<br></strong>FRAGMENT 4</p>\n<p>De terroristen van IS die de aanslagen in Parijs pleegden, noemen zichzelf moslims. Sommige mensen denken nu dat alle moslims gewelddadig zijn. Islamjuf Hajiba praat erover met de vijfde klas in Boom.</p>\n<p>Islamjuf Hajiba Yadine praat in de klas over islam en terrorisme. Ze legt de betekenis van islam uit: vrede. Vervolgens gaat het over het verschil tussen een moslim en een terrorist. De juf zegt dat IS niets met islam te maken heeft.</p>\n<p>&nbsp;</p>\n<p><strong>TERRORISME: EEN OVERZICHT VAN 9/11 TOT IS<br></strong>FRAGMENT 5</p>\n<p>Terrorisme overstijgt natuurlijk de recente aanslagen in Europa. De Vranckx-redactie zette alles sinds 9/11 op een rijtje.</p>\n<p>Vijftien jaar na 9/11 zijn we nog steeds in oorlog met terreur. Hoe is dat kunnen gebeuren? Van Afghanistan over Zarqawi tot het ‘kalifaat’: uitleg over de geschiedenis van terreur in Europa en de Verenigde Staten vanaf 11 september 2001 tot vandaag.</p>\n<p>&nbsp;</p>\n<p><strong>INTERNATIONAAL TERRORISME IN 1973<br></strong>FRAGMENT 6</p>\n<p>Terrorisme is ook geen recent fenomeen. In 1973 besprak Professor De Schutter het internationaal terrorisme en hoe men daarmee diende om te gaan.</p>\n<p> </p>\n<p><strong>TERREUR VROEGER EN NU<br></strong>FRAGMENT 7</p>\n<p>Strafpleiters is een zesdelige human interest reeks waarin Gilles De Coster praat met acht gerenommeerde strafpleiters.</p>\n<p>In de vierde aflevering vergelijken de strafpleiters de terreur vandaag en in het verleden. Volgens hen is vandaag iedereen een mogelijk doelwit geworden en is er daarom een grotere angst en achterdocht dan voorheen. Wat met terreur in de toekomst?</p>\n<p>&nbsp;</p>\n<p><strong>HOE VERANDERT TERREUR ONS LEVEN?<br></strong>FRAGMENT 8</p>\n<p>Advocaat Walter Damen stelt in ‘De Afspraak’ zijn boek ‘Dreigingsniveau 4: Hoe verandert terreur ons leven?’ voor. Bart Schols leest een fragment uit het boek voor. Hij schreef het boek in samenwerking met acht professoren om terrorisme vanuit verschillende standpunten te benaderen.</p>\n<p>Damen spreekt over hoe alles – vooral politiek getinte zaken – vandaag zwart of wit wordt bekeken, over politici die terreur gebruiken voor electoraal succes en over hoe in tijden van terreur alles kan en alles mag en dat fundamentele rechten, zoals het recht op verdediging, worden genegeerd. Damen wil terreur benaderen met een open visie.</p>\n<p>Valerie Van Peel, politica bij N-VA, en journalist Rudi Vranckx hebben het over het politieke getouwtrek en de moeilijkheid om tot een consenus te komen. Vranckx vindt dat er nooit maatregelen vanuit de onderbuik genomen mogen worden, maar enkel vanuit een technocratisch standpunt.</p>\n<p>Het gesprek gaat verder over een nood aan samenwerking, over repressie en preventie.</p>\n<p>&nbsp;</p>\n<p><strong>HOE KUNNEN WE TERRORISME BESTRIJDEN?<br></strong>FRAGMENT 9</p>\n<p>Interview met Martha Crenshaw, de grondlegster van het onderzoek naar terrorisme. Ze vertelt dat er geen simpele oplossingen bestaan voor terreur en terrorisme.</p>\n<p> </p>\n<p><strong><em>&nbsp;</em></strong></p>\n<p><strong><em>Meer weten? </em></strong></p>\n<p>Bekijk dan ook deze collecties op het Archief:</p>\n<p>- <a href=\"https://onderwijs.hetarchief.be/collecties/1466421\">Uitgeklaard: radicalisering</a></p>\n<p>- <a href=\"https://onderwijs.hetarchief.be/collecties/1047941\">Terreur: angst en vragen in de klas (secundair)</a></p>\n<p>- <a href=\"https://onderwijs.hetarchief.be/collecties/471391\">Omgaan met angst en terreur (secundair)</a></p>\n<p>&nbsp;</p>",
		collection_fragment_ids: [7, 8, 9, 10, 11, 12, 13, 14, 15],
	},
	{
		id: 1725141,
		owner_id: '7519df6a-ed47-1033-9340-93ee79608a9f',
		organisation_id: null,
		type_id: 3,
		title: 'KLAAR',
		lom_context_id: null,
		lom_classification_id: null,
		created_at: '3/7/2018 08:46:48+00',
		updated_at: '3/7/2018 08:48:51+00',
		is_public: false,
		publish_at: null,
		depublish_at: null,
		lom_keyword_id: null,
		lom_intendedenduserrole_id: null,
		external_id: 'N1HlKjPM6JTHWKaAma93IQlZ',
		description: 'De leukste klaarfilmpjes!!',
		collection_fragment_ids: [5, 6],
	},
	{
		id: 1326091,
		owner_id: '7519df6a-ed47-1033-9340-93ee79608a9f',
		organisation_id: null,
		type_id: 3,
		title: 'Down',
		lom_context_id: null,
		lom_classification_id: null,
		created_at: '24/11/2017 09:08:16+00',
		updated_at: '13/3/2018 09:44:01+00',
		is_public: false,
		publish_at: null,
		depublish_at: null,
		lom_keyword_id: null,
		lom_intendedenduserrole_id: null,
		external_id: 'ijmNHISkwS8QgXlmTlg5L99R',
		description: 'Het syndroom.\n\nhttp://www.viaa.be\n',
		collection_fragment_ids: [4],
	},
	{
		id: 1725161,
		owner_id: '7519df6a-ed47-1033-9340-93ee79608a9f',
		organisation_id: null,
		type_id: 3,
		title: 'Uitgeklaard: terrorisme',
		lom_context_id: null,
		lom_classification_id: null,
		created_at: '3/7/2018 09:02:35+00',
		updated_at: '3/12/2018 10:36:53+00',
		is_public: false,
		publish_at: null,
		depublish_at: null,
		lom_keyword_id: null,
		lom_intendedenduserrole_id: null,
		external_id: 'y2TPRl3aUMRr2gCbeNkKft6J',
		description: "<p><strong><em>Deze collectie werd aangemaakt voor de KLAAR-aflevering 'Wat is terrorisme?’.&nbsp;</em></strong><strong><em>Het beeld- en geluidsmateriaal uit deze collectie kan gebruikt worden in de eerste en tweede graad van het secundair onderwijs.</em></strong></p>\n<p>&nbsp;</p>\n<p><strong>KLAAR: WAT IS TERRORISME?<br></strong>FRAGMENT 1</p>\n<p>Wat is terrorisme? Bijna elke dag kan je in het nieuws iets horen over terrorisme, terroristen of aanslagen ergens in de wereld. Het lijkt alsof terrorisme overal is.</p> \n<p>Moeten we er dan bang voor zijn, of net niet? En wat is het eigenlijk precies? Yousri vraagt het aan VRT NWS-expert Steven Decraene.</p> <p> </p>\n<p>\n</p>\n<p><strong>22/03/2016: DE AANSLAGEN IN BRUSSEL<br></strong>FRAGMENT 2</p>\n<p>Ga even terug naar 22 maart 2016 met deze nieuwsspecial naar aanleiding van de aanslagen in Zaventem en Brussel, gepresenteerd door Martine Tanghe en Lieven Van Gils.</p>\n<p>00:00:00 Gesprek met de verschillende studiogasten.<br><br><em>De studiogasten zijn minister van Binnenlandse Zaken Jan Jambon, minister van Justitie Koen Geens, voorzitter van het Davidsfonds Norbert D'Hulst, journalist Phil Van Den Bossche, choreograaf Ish Ait Hamou, VRT-journaliste Caroline Van Den Berghe, VRT-journalist Rudi Vranckx, imam Sulayman Van Ael, gemeenteraadslid van MR Elsene Assita Kanko, traumapsycholoog van de brandweer Eric de Soir, psychiater Dirk De Wachter, zanger Bart Peeters, minister van Onderwijs Hilde Crevits en vice-premier Alexander De Croo.<br><br></em>00:24:14 Een gesprek met Ish Ait Hamou.<br>00:26:59 De getuigenis van Tatyana Beloy.<br>00:42:30 Een gesprek met voormalig imam Sulayman Van Ael.<br>00:48:30 Debat met gemeenteraadslid van MR Elsene Assita Kanko.<br>01:01:46 Gesprek met traumapsycholoog van de brandweer Eric de Soir.<br>01:07:00 Gesprek met Bart Peeters.<br>00:14:03 Korte reportage over een geschrapte schooluitstap en de reactie van minister van Onderwijs Hilde Crevits.<br>01:25:00 Een liedje van Bart Peeters.<br>01:30:17 Gesprek met vice-premier Alexander De Croo.<br>01:44:05 Beelden van het Beursplein dinsdagavond.</p>\n<p>&nbsp;</p>\n<p><strong>DE IMPACT VAN TERREUR <br></strong>FRAGMENT 3</p>\n<p>In deze aflevering van de human-interestreeks De klas gaat Erik Van Looy met de leerlingen in gesprek over geweld.</p>\n<p>Is de leefwereld van jongeren harder en gewelddadiger geworden dan in Eriks jeugd? En welke impact heeft de terreurdreiging op ons leven?</p>\n<p>&nbsp;</p>\n<p><strong>ISLAM EN TERRORISME<br></strong>FRAGMENT 4</p>\n<p>De terroristen van IS die de aanslagen in Parijs pleegden, noemen zichzelf moslims. Sommige mensen denken nu dat alle moslims gewelddadig zijn. Islamjuf Hajiba praat erover met de vijfde klas in Boom.</p>\n<p>Islamjuf Hajiba Yadine praat in de klas over islam en terrorisme. Ze legt de betekenis van islam uit: vrede. Vervolgens gaat het over het verschil tussen een moslim en een terrorist. De juf zegt dat IS niets met islam te maken heeft.</p>\n<p>&nbsp;</p>\n<p><strong>TERRORISME: EEN OVERZICHT VAN 9/11 TOT IS<br></strong>FRAGMENT 5</p>\n<p>Terrorisme overstijgt natuurlijk de recente aanslagen in Europa. De Vranckx-redactie zette alles sinds 9/11 op een rijtje.</p>\n<p>Vijftien jaar na 9/11 zijn we nog steeds in oorlog met terreur. Hoe is dat kunnen gebeuren? Van Afghanistan over Zarqawi tot het ‘kalifaat’: uitleg over de geschiedenis van terreur in Europa en de Verenigde Staten vanaf 11 september 2001 tot vandaag.</p>\n<p>&nbsp;</p>\n<p><strong>INTERNATIONAAL TERRORISME IN 1973<br></strong>FRAGMENT 6</p>\n<p>Terrorisme is ook geen recent fenomeen. In 1973 besprak Professor De Schutter het internationaal terrorisme en hoe men daarmee diende om te gaan.</p>\n<p> </p>\n<p><strong>TERREUR VROEGER EN NU<br></strong>FRAGMENT 7</p>\n<p>Strafpleiters is een zesdelige human interest reeks waarin Gilles De Coster praat met acht gerenommeerde strafpleiters.</p>\n<p>In de vierde aflevering vergelijken de strafpleiters de terreur vandaag en in het verleden. Volgens hen is vandaag iedereen een mogelijk doelwit geworden en is er daarom een grotere angst en achterdocht dan voorheen. Wat met terreur in de toekomst?</p>\n<p>&nbsp;</p>\n<p><strong>HOE VERANDERT TERREUR ONS LEVEN?<br></strong>FRAGMENT 8</p>\n<p>Advocaat Walter Damen stelt in ‘De Afspraak’ zijn boek ‘Dreigingsniveau 4: Hoe verandert terreur ons leven?’ voor. Bart Schols leest een fragment uit het boek voor. Hij schreef het boek in samenwerking met acht professoren om terrorisme vanuit verschillende standpunten te benaderen.</p>\n<p>Damen spreekt over hoe alles – vooral politiek getinte zaken – vandaag zwart of wit wordt bekeken, over politici die terreur gebruiken voor electoraal succes en over hoe in tijden van terreur alles kan en alles mag en dat fundamentele rechten, zoals het recht op verdediging, worden genegeerd. Damen wil terreur benaderen met een open visie.</p>\n<p>Valerie Van Peel, politica bij N-VA, en journalist Rudi Vranckx hebben het over het politieke getouwtrek en de moeilijkheid om tot een consenus te komen. Vranckx vindt dat er nooit maatregelen vanuit de onderbuik genomen mogen worden, maar enkel vanuit een technocratisch standpunt.</p>\n<p>Het gesprek gaat verder over een nood aan samenwerking, over repressie en preventie.</p>\n<p>&nbsp;</p>\n<p><strong>HOE KUNNEN WE TERRORISME BESTRIJDEN?<br></strong>FRAGMENT 9</p>\n<p>Interview met Martha Crenshaw, de grondlegster van het onderzoek naar terrorisme. Ze vertelt dat er geen simpele oplossingen bestaan voor terreur en terrorisme.</p>\n<p> </p>\n<p><strong><em>&nbsp;</em></strong></p>\n<p><strong><em>Meer weten? </em></strong></p>\n<p>Bekijk dan ook deze collecties op het Archief:</p>\n<p>- Uitgeklaard: radicalisering</p>\n<p>- Terreur: angst en vragen in de klas (secundair)</p>\n<p>- Omgaan met angst en terreur (secundair)</p>\n<p>&nbsp;</p>",
		collection_fragment_ids: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26],
	},
	{
		id: 1131711,
		owner_id: '7519df6a-ed47-1033-9340-93ee79608a9f',
		organisation_id: null,
		type_id: 3,
		title: 'Reizen',
		lom_context_id: null,
		lom_classification_id: null,
		created_at: '20/9/2017 08:55:56+00',
		updated_at: '19/3/2018 09:04:07+00',
		is_public: false,
		publish_at: null,
		depublish_at: null,
		lom_keyword_id: null,
		lom_intendedenduserrole_id: null,
		external_id: 'p1O2AKNGAoSQOTgPUp7bwV7n',
		description: "<a href=\"http://www.viaa.beWat\">http://www.viaa.beWat</a> is Lorem Ipsum?Lorem Ipsum is slechts een proeftekst uit het drukkerij- en zetterijwezen. Lorem Ipsum is de standaard proeftekst in deze bedrijfstak sinds de 16e eeuw, toen een onbekende drukker een zethaak met letters nam en ze door elkaar husselde om een font-catalogus te maken. Het heeft niet alleen vijf eeuwen overleefd maar is ook, vrijwel onveranderd, overgenomen in elektronische letterzetting. Het is in de jaren '60 populair geworden met de introductie van Letraset vellen met Lorem Ipsum passages en meer recentelijk door desktop publishing software zoals Aldus PageMaker die versies van Lorem Ipsum bevatten.",
		collection_fragment_ids: [2, 3],
	},
];
