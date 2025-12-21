
"use strict";

const Globals = {
	Mandant: {
		Id: "1"
	},
	Land: {
		Id: "8"
	},
	Saison: {
		Id: "11"
	},
	Ticker: {
		Id: 0
	},
	Spielwoche: {
		Live: "0",
		Heute: "1",
		Letzte: "2",
		Aktuelle: "3",
		Naechste: "4"   
	},
	Spieltag: {
		Status: {
			Beendet: "1"
		}
	},
	Art: {
		Bund: "0",
		Land: "1",
		Bezirk: "2",
		Klub: "3",
		Favorit: "4",
		
		Liga: "0",
		Pokal: "1",
		Freundschaftspiel: "2",
		Spielwoche: "3",
		Schnitt: "4",
		
		Spielplan: "0",
		Bahnanlage: "1",
		Spieltag: "2",
		
		Kegel: "0",
		Punkte: "1"
	},
	Objekt: {
		Saison: "0",
		Bezirk: "1",
		Liga: "2",
		Spieltag: "3"
	},
	Fehler: ["Es ist ein Systemfehler aufgetretten.", "Es können maximal 10 Ligen als Favorit ausgewählt werden."]
}
var Settings = {
	Options: {
		Tabelle: {
			Art: "id-tabelle-art-erweitert",
			Sort: "id-tabelle-sort-gesamt"
		},
		Schnitt: {
			Art: "id-schnitt-art-erweitert",
			Sort: "id-schnitt-sort-ausw",
			Anzahl: 1
		},
		Spieltagbester: {
			Sort: "id-spieltagbester-sort-ausw",
			Anzahl: 10
		},
		Klub: {
			Nummer: "",
			Name: "",
			Farbe: false
		}
	},
	Saison: {
		Id: Globals.Saison.Id,
		Index: 0,
		DefaultIndex: 0
	},
	Bezirk: {
		Id: 0,
		Art: Globals.Art.Land,
		Index: 0,
		DefaultIndex: 0
	},
	Liga: {
		Id: null,
		Wertung: null,
		Art: null,
		Index: null,
		DefaultIndex: 0
	},
	Spieltag: {
		Id: null,
		Nummer: null,
		Index: null,
		DefaultIndex: 0
	},
	Favorit: []
}
function initSettings(Strategy) {
	if( Strategy == Globals.Objekt.Saison ) {
		if(!Settings.Saison.Id || isNaN(Settings.Saison.Id)) {
			Settings.Saison.Id = Globals.Saison.Id;
			Settings.Saison.Index = Settings.Saison.DefaultIndex;
		}
		Settings.Bezirk.Id = null;
		initSettings(Globals.Objekt.Bezirk);
	}
	if(Strategy == Globals.Objekt.Bezirk) {
		if(!Settings.Bezirk.Id || isNaN(Settings.Bezirk.Id)) {
			Settings.Bezirk.Id = 0;
			Settings.Bezirk.Art = Globals.Art.Land;
			Settings.Bezirk.Index = Settings.Bezirk.DefaultIndex;
		}
		Settings.Liga.Id = null;
		initSettings(Globals.Objekt.Liga);
	}
	if(Strategy == Globals.Objekt.Liga) {
		if(!Settings.Liga.Id || isNaN(Settings.Liga.Id)) {
			Settings.Liga.Id = 0;
			Settings.Liga.Art = null;
			Settings.Liga.Index = null;
		}
		Settings.Spieltag.Id = null;
		initSettings(Globals.Objekt.Spieltag);
	}
	if(Strategy == Globals.Objekt.Spieltag) {
		if(!Settings.Spieltag.Id || isNaN(Settings.Spieltag.Id)) {
			Settings.Spieltag.Id = 0;
			Settings.Spieltag.Art = null;
			Settings.Spieltag.Nummer = null;
			Settings.Spieltag.Index = null;
		}
	}
}
function loadMain() {
	$(".main").empty().hide();
	$(".main").append("<div class=\"container-fluid\"><div class=\"row\"><div class=\"media col-xs-12 intro-background\"><div class=\"media-left\" style=\"padding:20px\"><a href=\"http://www.skvb.de\"><img class=\"intro-logo\" src=\"png/skvb_logo_lg.png\" srcset=\"png/skvb_logo_sm.png 320w, png/skvb_logo_md.png 600w, png/skvb_logo_lg.png 900w\" sizes=\"(max-width: 320px) 33.3vw, (max-width: 600px) 66.6vw, 100vw\" alt=\"SKVB\"></a></div><div class=\"media-body\" style=\"display:table-cell; vertical-align:middle;\"><h4 class=\"media-heading\" style=\"font-size: 4vw; font-weight: 900;\">Willkommen beim Ergebnisdienst des Sportkegler- und Bowlingverbands Brandenburg e.V.</h4></div></div></div><div class=\"row\"><div class=\"col-xs-12 impressum-align\"><p><a style=\"text-decoration: underline;\" href=\"https://www.sportwinner.de\">&copy; Sportwinner Software</a>, Am Hoffeld 17, 97265 Hettstadt, Deutschland.</p><p>Telefon: <a href=\"tel:+4915155657411\">+49 (0)151 55657411</a> Mo-Fr 18 - 20 Uhr<span style=\"padding-left: 7px; padding-right: 7px;\">|</span>E-Mail: <a href=\"mailto:support@sportwinner.de\">support@sportwinner.de</a></p><p><a id=\"impressum\" href=\"javascript:;\">Impressum</a><span style=\"padding-left: 7px; padding-right: 7px;\">|</span><a id=\"datenschutz\" href=\"javascript:;\">Datenschutzerklärung</a></p></div></div></div>");
}
function loadImpressum() {
	$(".main").empty();
	$(".main").append("<div class=\"container\"><h2 class=\"text-muted\">IMPRESSUM</h2>Angaben gemäß § 5 TMG<hr><h4><strong>Herausgeber</strong></h4>Sportwinner Software<br>Am Hoffeld 17<br>97265 Hettstadt, Deutschland<br><a href=\"tel:+4915155657411\">+49 (0)151 55657411</a> Mo-Fr 18 - 20 Uhr<br><a href=\"mailto:support@sportwinner.de\">support@sportwinner.de</a><br><br><h4><strong>Vertreten durch</strong></h4>Ivan Kerentchev<br><br><h4><strong>Haftung für Inhalte</strong></h4>Die in „Sportwinner Kegeln“ eingestellten Nutzerinhalte basieren auf Angaben Dritter, so dass für deren Richtigkeit, Vollständigkeit und Aktualität von Sportwinner Software keine Haftung übernommen werden kann, sofern und soweit nicht zwingende gesetzliche Bestimmungen eine Haftung des Providers vorschreiben. Fremde Informationen und Inhalte, die von den Nutzern eingestellt bzw. auf unsere Dienste hochgeladen werden, stellen keine Äußerungen, Bewertungen, Empfehlungen oder Feststellungen von Sportwinner Software dar. Wir machen uns solche Nutzerinhalte nicht zu eigen und sind nicht verpflichtet, diese auf deren Richtigkeit, Vollständigkeit und Rechtmäßigkeit hin zu überprüfen. Daher sind wir für Nutzerinhalte auch nicht verantwortlich, sofern und soweit wir keine Kenntnis von deren Unrichtigkeit, Unvollständigkeit oder Rechtswidrigkeit haben. Wenn Sportwinner Software auf Rechtsverletzungen hingewiesen wird, nehmen wir unverzüglich die uns (dann) obliegende Überprüfung der betreffenden Nutzerinhalte vor und leiten ggfs. weitere Maßnahmen (z.B. deren Löschung) ein.<br><br>Die Nutzung des Internets und der hierzu verwendeten Geräte erfolgt auf eigene Gefahr des Nutzers. Wir übernehmen keine Haftung für den Zugang zu unseren Diensten über das Internet sowie für technisch bedingte Unterbrechungen und/oder den Ausfall unserer Dienste.<br><br><h4><strong>Haftung für Links</strong></h4>Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Die in „Sportwinner Kegeln“ eingestellten Links basieren auf Angaben Dritter, so dass für deren Richtigkeit, Vollständigkeit und Aktualität von Sportwinner Software keine Haftung übernommen werden kann.<br><br>Soweit die Weiterleitung auf Datenbanken, Websites, Dienste etc. Dritter, z.B. durch die Einstellung von Links oder Hyperlinks oder Schnittstellen zu anderen Applikationen gegeben ist, haftet Sportwinner Software weder für Zugänglichkeit, Bestand oder Sicherheit dieser Datenbanken oder Dienste, noch für den Inhalt derselben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.<br><br>Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße durch den Ersteller überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.<br><br><h4><strong>Urheberrecht</strong></h4>Alle Texte, Grafiken, Bilder, multimediale und sonstige Inhalte unterliegen dem Urheberrecht und anderen gesetzlichen Bestimmungen zum Schutze des Eigentums. Jede entgeltliche und unentgeltliche Verwendung, insbesondere Veränderung, Weitergabe, Einbindung auf anderen Webseiten, bedarf der schriftlichen Genehmigung durch Sportwinner Software.<br><br><h4><strong>Verletzung von Rechten Dritter</strong></h4>Sollten Sie Ihre Rechte durch unsere Seiten verletzt sehen, so bitten wir Sie, uns direkt darauf anzusprechen. Wir versichern Ihnen, dass wir Ihre berechtigten Einwendungen ernst nehmen und unverzüglich Änderungen veranlassen werden. Eine formelle Abmahnung Ihrerseits ist hierzu nicht notwendig. Die durch eine Abmahnung entstehenden Kosten werden wir zurückweisen, insofern Sie nicht von der Möglichkeit des direkten Kontakts mit uns Gebrauch gemacht haben. Ebenso kündigen wir unseren Wettbewerbern an, dass wir Sie selbstverständlich in oben genannten Fällen direkt ansprechen werden.<br><br><br></div>");
}
function loadDatenschutz() {
	$(".main").empty();
	$(".main").append("<div class=\"container\"><h2 class=\"text-muted\">DATENSCHUTZERKLÄRUNG</h2><hr><h4><strong>Benennung der verantwortlichen Stelle</strong></h4>Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:<br><br><a href=\"http://www.skvb.de/index.php?id=86\">Sportkegler- und Bowlingverband Brandenburg e.V.</a><br>Brandenburger Chaussee 11<br>D - 14542 Werder/Havel<br><br>Die verantwortliche Stelle entscheidet allein oder gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten (z.B. Namen, Kontaktdaten o. Ä.).<br><br><h4><strong>Allgemeine Datenschutzerklärung / Cookies / Analytics</strong></h4>Durch die Nutzung dieser Website erklären Sie sich mit der Verarbeitung und Nutzung von Daten gemäß der nachfolgenden Beschreibung einverstanden. Unsere Website kann grundsätzlich ohne Registrierung besucht werden. Dabei werden keine personenbezogene Daten erhoben. Diese Webseite benutzt keine Cookies oder sonstige Webanalyse-Dienste zur statistischen Zwecken.<br><br><br></div>");
}
function loadSaison() {
	$("#id-dropdown-menu-saison").empty();
	$.post("/php/skvb/service.php", { 
		command: "GetSaisonArray"
	},
	function( data, status ) {
		Settings.Saison.Index = 0;
		for (var i in data) {
			$("#id-dropdown-menu-saison").append("<li class=\"menuitem-saison\" id=\"id-menuitem-saison-"+data[i][0]+"\" id-menuitem-saison=\""+data[i][0]+"\" index-menuitem-saison=\""+$("#id-dropdown-menu-saison").children().length+"\"><a href=\"javascript:;\">"+data[i][1]+"</a></li>");
			if(data[i][0] == Settings.Saison.Id) {
				Settings.Saison.Index = i;
			}
		}
		initSaison();
	}, "json" ).fail( function() {
		initSaison();
	});
}
function initSaison() {
	$("#id-dropdown-saison").removeAttr("id-dropdown-saison");
	$("#id-dropdown-saison").removeAttr("index-dropdown-saison");
	if(!!$("[index-menuitem-saison=\""+Settings.Saison.Index+"\"]").text().trim()) {
		$("#id-dropdown-saison").show();
		$("#id-dropdown-saison").attr("id-dropdown-saison", Settings.Saison.Id);
		$("#id-dropdown-saison").attr("index-dropdown-saison", Settings.Saison.Index);
		$("#id-dropdown-saison").html($("[index-menuitem-saison=\""+Settings.Saison.Index+"\"]").text()+" <span class=\"caret\"></span>");
	} else {
		$("#id-dropdown-saison").hide();
	}
	loadKlub();
}
function loadKlub() {
	$("#id-dropdown-menu-bezirk").empty();
	if($("#id-dropdown-saison").is(':visible')) {
		$.post("/php/skvb/service.php", { 
			command: "GetKlub", 
			id_saison: Settings.Saison.Id,
			nr_klub: Settings.Options.Klub.Nummer,
			name_klub: Settings.Options.Klub.Name
		}, 
		function( data, status ) {
			if(data.length == 1) {
				Settings.Options.Klub.Nummer = data[0][1];
				Settings.Options.Klub.Name = data[0][2];
				$("#id-dropdown-menu-bezirk").append("<li class=\"menuitem-bezirk\" id=\"id-menuitem-bezirk-"+data[0][0]+"\" id-menuitem-bezirk=\""+data[0][0]+"\" art-menuitem-bezirk=\""+Globals.Art.Klub+"\" index-menuitem-bezirk=\""+$("#id-dropdown-menu-bezirk").children().length+"\"><a href=\"javascript:;\">"+data[0][2]+"</a></li>");
				$("#id-dropdown-menu-bezirk").append("<li class=\"divider\"></li>");
				if( Settings.Bezirk.Art == (Globals.Art.Klub + Globals.Art.Favorit)) {
					Settings.Bezirk.Art = Globals.Art.Klub;
					Settings.Bezirk.Id = data[0][0];
					Settings.Bezirk.Index = $("#id-dropdown-menu-bezirk").children().length-2;
				}
			}
			loadFavorit();
		}, "json" ).fail( function() {
			loadFavorit();
		});
	} else {
		loadFavorit();
	}
}
function loadFavorit() {
	if( $("#id-dropdown-saison").is(':visible')) {
		var Index = -1;
		for( var i = 0; i < Settings.Favorit.length; i++) {
			if( Settings.Favorit[i].Saison == Settings.Saison.Id ) {
				Index = i;
				break;
			}
		}
		if(Index >= 0) {
			$("#id-dropdown-menu-bezirk").append("<li class=\"menuitem-bezirk\" id=\"id-menuitem-bezirk-0\" id-menuitem-bezirk=\"0\" art-menuitem-bezirk=\""+Globals.Art.Favorit+"\" index-menuitem-bezirk=\""+$("#id-dropdown-menu-bezirk").children().length+"\"><a href=\"javascript:;\">Favoriten</a></li>");
			$("#id-dropdown-menu-bezirk").append("<li class=\"divider\"></li>");
			if( Settings.Bezirk.Art == (Globals.Art.Klub + Globals.Art.Favorit) ) {
				Settings.Bezirk.Art = Globals.Art.Favorit;
				Settings.Bezirk.Id = 0;
				Settings.Bezirk.Index = $("#id-dropdown-menu-bezirk").children().length-2;
			}
		}
	}
	loadBezirk();
}
function loadBezirk() {
	if($("#id-dropdown-saison").is(':visible')) {
		$("#id-dropdown-menu-bezirk").append("<li class=\"menuitem-bezirk\" id=\"id-menuitem-bezirk-0\" id-menuitem-bezirk=\"0\" art-menuitem-bezirk=\""+Globals.Art.Bund+"\" index-menuitem-bezirk=\""+$("#id-dropdown-menu-bezirk").children().length+"\"><a href=\"javascript:;\">Bundesligen</a></li>");
		$("#id-dropdown-menu-bezirk").append("<li class=\"divider\"></li>");
		$("#id-dropdown-menu-bezirk").append("<li class=\"menuitem-bezirk\" id=\"id-menuitem-bezirk-0\" id-menuitem-bezirk=\"0\" art-menuitem-bezirk=\""+Globals.Art.Land+"\" index-menuitem-bezirk=\""+$("#id-dropdown-menu-bezirk").children().length+"\"><a href=\"javascript:;\">SKVB-Ligen</a></li>");
		Settings.Bezirk.DefaultIndex = $("#id-dropdown-menu-bezirk").children().length-1;
		if( (Settings.Bezirk.Art == Globals.Art.Land && !Settings.Bezirk.Index) || Settings.Bezirk.Art == (Globals.Art.Klub + Globals.Art.Favorit)) {
			Settings.Bezirk.Id = null;
			initSettings(Globals.Objekt.Bezirk);
		}
		$.post("/php/skvb/service.php", { 
			command: "GetBezirkArray", 
			id_saison: Settings.Saison.Id
		},
		function( data, status ) {
			if(data.length > 0) {
				$("#id-dropdown-menu-bezirk").append("<li class=\"divider\"></li>");
			}
			for (var i in data) {
				$("#id-dropdown-menu-bezirk").append("<li class=\"menuitem-bezirk\" id=\"id-menuitem-bezirk-"+data[i][0]+"\" id-menuitem-bezirk=\""+data[i][0]+"\" art-menuitem-bezirk=\""+Globals.Art.Bezirk+"\" index-menuitem-bezirk=\""+$("#id-dropdown-menu-bezirk").children().length+"\"><a href=\"javascript:;\">"+data[i][1]+"</a></li>");
				if( Settings.Bezirk.Art == Globals.Art.Bezirk && Settings.Bezirk.Index == undefined && Settings.Bezirk.Id == data[i][0] ) {
					Settings.Bezirk.Index = $("#id-dropdown-menu-bezirk").children().length-1;
				}
			}
			initBezirk();
		}, "json" ).fail( function() {
			initBezirk();
		});
	} else {
		initBezirk();
	}
}
function initBezirk() {
	$("#id-dropdown-bezirk").removeAttr("id-dropdown-bezirk");
	$("#id-dropdown-bezirk").removeAttr("art-dropdown-bezirk");
	$("#id-dropdown-bezirk").removeAttr("index-dropdown-bezirk");
	$("#id-button-tabelle-option, #id-button-tabelle-gesamt, #id-button-tabelle-heim, #id-button-tabelle-ausw").addClass("disabled");
	$("#id-button-schnitt-option, #id-button-schnitt-gesamt, #id-button-schnitt-heim, #id-button-schnitt-ausw").addClass("disabled");
	if($("#id-dropdown-saison").is(':visible')
	&& !!$("[index-menuitem-bezirk=\""+Settings.Bezirk.Index+"\"]").text().trim()) {
		$("#id-dropdown-bezirk").show();
		$("#id-dropdown-bezirk").attr("id-dropdown-bezirk", Settings.Bezirk.Id);
		$("#id-dropdown-bezirk").attr("art-dropdown-bezirk", Settings.Bezirk.Art);
		$("#id-dropdown-bezirk").attr("index-dropdown-bezirk", Settings.Bezirk.Index);
		$("#id-dropdown-bezirk").html($("[index-menuitem-bezirk=\""+Settings.Bezirk.Index+"\"]").text()+" <span class=\"caret\"></span>");
	} else {
		$("#id-dropdown-bezirk").hide();
	}
	loadLiga();
}
function loadLiga() {
	var Favorit = "";
	$("#id-dropdown-menu-liga").empty();
	if($("#id-dropdown-bezirk").is(':visible')) {
		$("#id-dropdown-menu-liga").append("<li class=\"menuitem-liga\" id=\"id-menuitem-liga-0\" id-menuitem-liga=\""+Globals.Spielwoche.Live+"\" art-menuitem-liga=\""+Globals.Art.Spielwoche+"\" index-menuitem-liga=\""+$("#id-dropdown-menu-liga").children().length+"\"><a href=\"javascript:;\">Live</a></li>");
		$("#id-dropdown-menu-liga").append("<li class=\"menuitem-liga\" id=\"id-menuitem-liga-0\" id-menuitem-liga=\""+Globals.Spielwoche.Heute+"\" art-menuitem-liga=\""+Globals.Art.Spielwoche+"\" index-menuitem-liga=\""+$("#id-dropdown-menu-liga").children().length+"\"><a href=\"javascript:;\">Heute</a></li>");
		$("#id-dropdown-menu-liga").append("<li class=\"divider\"></li>");												 
		$("#id-dropdown-menu-liga").append("<li class=\"menuitem-liga\" id=\"id-menuitem-liga-0\" id-menuitem-liga=\""+Globals.Spielwoche.Letzte+"\" art-menuitem-liga=\""+Globals.Art.Spielwoche+"\" index-menuitem-liga=\""+$("#id-dropdown-menu-liga").children().length+"\"><a href=\"javascript:;\">Letzte Spielwoche</a></li>");
		$("#id-dropdown-menu-liga").append("<li class=\"menuitem-liga\" id=\"id-menuitem-liga-0\" id-menuitem-liga=\""+Globals.Spielwoche.Aktuelle+"\" art-menuitem-liga=\""+Globals.Art.Spielwoche+"\" index-menuitem-liga=\""+$("#id-dropdown-menu-liga").children().length+"\"><a href=\"javascript:;\">Aktuelle Spielwoche</a></li>");
		$("#id-dropdown-menu-liga").append("<li class=\"menuitem-liga\" id=\"id-menuitem-liga-0\" id-menuitem-liga=\""+Globals.Spielwoche.Naechste+"\" art-menuitem-liga=\""+Globals.Art.Spielwoche+"\" index-menuitem-liga=\""+$("#id-dropdown-menu-liga").children().length+"\"><a href=\"javascript:;\">Nächste Spielwoche</a></li>");
/* TODO		if(Settings.Bezirk.Art == Globals.Art.Klub) {
			$("#id-dropdown-menu-liga").append("<li class=\"menuitem-liga\" id=\"id-menuitem-liga-0\" id-menuitem-liga=\"0\" art-menuitem-liga=\""+Globals.Art.Schnitt+"\" index-menuitem-liga=\""+$("#id-dropdown-menu-liga").children().length+"\"><a href=\"javascript:;\">Schnittliste</a></li>");
			$("#id-dropdown-menu-liga").append("<li class=\"divider\"></li>");
		}*/
		if(Settings.Bezirk.Art == Globals.Art.Favorit) {
			for( var i=0; i < Settings.Favorit.length; i++ ) {
				if(i>0) { Favorit += ", " }
				Favorit += Settings.Favorit[i].Liga;
			}
		}
		$.post("/php/skvb/service.php", { 
			command: "GetLigaArray", 
			id_saison: Settings.Saison.Id,
			id_bezirk: Settings.Bezirk.Id,
			favorit: Favorit || "",
			art: Settings.Bezirk.Art
		},
		function( data, status ) {
			if(data.length > 0) {
				$("#id-dropdown-menu-liga").append("<li class=\"divider\"></li>");
			}
			for (var i in data) {
				$("#id-dropdown-menu-liga").append("<li class=\"menuitem-liga\" id=\"id-menuitem-liga-"+data[i][0]+"\" id-menuitem-liga=\""+data[i][0]+"\" wertung-menuitem-liga=\""+data[i][1]+"\" art-menuitem-liga=\""+data[i][3]+"\" index-menuitem-liga=\""+$("#id-dropdown-menu-liga").children().length+"\" spielleiter-menuitem-liga=\""+data[i][4]+"\" telefon-menuitem-liga=\""+data[i][5]+"\" mobil-menuitem-liga=\""+data[i][6]+"\" fax-menuitem-liga=\""+data[i][7]+"\" email-menuitem-liga=\""+data[i][8]+"\"><a href=\"javascript:;\">"+data[i][2]+"</a></li>");
			}
			initLiga();
		}, "json" ).fail( function() {
			initLiga();
		});
	} else {
		initLiga();
	}
}
function initLiga() {
	var Liga = $("[index-menuitem-liga=\""+Settings.Liga.Index+"\"]").text().trim() || "Eine Liga auswählen";
	$("#id-dropdown-liga").removeAttr("id-dropdown-liga");
	$("#id-dropdown-liga").removeAttr("wertung-dropdown-liga");
	$("#id-dropdown-liga").removeAttr("art-dropdown-liga");
	$("#id-dropdown-liga").removeAttr("index-dropdown-liga");
	if($("#id-dropdown-bezirk").is(':visible')) {
		$("#id-dropdown-liga").show();
		$("#id-dropdown-liga").attr("id-dropdown-liga", Settings.Liga.Id);
		$("#id-dropdown-liga").attr("wertung-dropdown-liga", Settings.Liga.Wertung);
		$("#id-dropdown-liga").attr("art-dropdown-liga", Settings.Liga.Art);
		$("#id-dropdown-liga").attr("index-dropdown-liga", Settings.Liga.Index);
		$("#id-dropdown-liga").html(Liga+" <span class=\"caret\"></span>");
	} else {
		$("#id-dropdown-liga").hide();
	}
	loadSpieltag();
}
function loadSpieltag() {
	$("#id-dropdown-menu-spieltag").empty();
	if($("#id-dropdown-liga").is(':visible')
	&& (Settings.Liga.Art == Globals.Art.Liga || Settings.Liga.Art == Globals.Art.Pokal)) {
		$("#id-dropdown-menu-spieltag").append("<li class=\"menuitem-spieltag\" id=\"id-menuitem-spieltag-0\" art-menuitem-spieltag=\""+Globals.Art.Spielplan+"\" id-menuitem-spieltag=\"0\" nr-menuitem-spieltag=\"0\" index-menuitem-spieltag=\""+$("#id-dropdown-menu-spieltag").children().length+"\"><a href=\"javascript:;\">Spielplan</a></li>");	
		$("#id-dropdown-menu-spieltag").append("<li class=\"menuitem-spieltag\" id=\"id-menuitem-spieltag-0\" art-menuitem-spieltag=\""+Globals.Art.Bahnanlage+"\" id-menuitem-spieltag=\"0\" nr-menuitem-spieltag=\"0\" index-menuitem-spieltag=\""+$("#id-dropdown-menu-spieltag").children().length+"\"><a href=\"javascript:;\">Bahnanlagen</a></li>");
		$("#id-dropdown-menu-spieltag").append("<li class=\"divider\"></li>");
		$.post("/php/skvb/service.php", { 
			command: "GetSpieltagArray", 
			id_saison: Settings.Saison.Id,
			id_liga: Settings.Liga.Id
		},
		function( data, status ) {
			for (var i in data) {
				if( data[i][3] == Globals.Spieltag.Status.Beendet ) {
					$("#id-dropdown-menu-spieltag").append("<li class=\"menuitem-spieltag\" id=\"id-menuitem-spieltag-"+data[i][0]+"\" art-menuitem-spieltag=\""+Globals.Art.Spieltag+"\" id-menuitem-spieltag=\""+data[i][0]+"\" nr-menuitem-spieltag=\""+data[i][1]+"\" index-menuitem-spieltag=\""+$("#id-dropdown-menu-spieltag").children().length+"\"><a style=\"color: SteelBlue;\" href=\"javascript:;\"><span class=\"glyphicon glyphicon-ok\"></span> "+data[i][2]+"</a></li>");
				} else {
					$("#id-dropdown-menu-spieltag").append("<li class=\"menuitem-spieltag\" id=\"id-menuitem-spieltag-"+data[i][0]+"\" art-menuitem-spieltag=\""+Globals.Art.Spieltag+"\" id-menuitem-spieltag=\""+data[i][0]+"\" nr-menuitem-spieltag=\""+data[i][1]+"\" index-menuitem-spieltag=\""+$("#id-dropdown-menu-spieltag").children().length+"\"><a href=\"javascript:;\">"+data[i][2]+"</a></li>");
				}
			}
			initSpieltag();
		}, "json" ).fail( function() {
			initSpieltag();
		});
	} else {
		initSpieltag();
	}
}
function initSpieltag() {
	var Spieltag = $("[index-menuitem-spieltag=\""+Settings.Spieltag.Index+"\"]").text().trim() || "Einen Spieltag auswählen";
	$("#id-dropdown-spieltag").removeAttr("id-dropdown-spieltag");
	$("#id-dropdown-spieltag").removeAttr("nr-dropdown-spieltag");
	$("#id-dropdown-spieltag").removeAttr("art-dropdown-spieltag");
	$("#id-dropdown-spieltag").removeAttr("index-dropdown-spieltag");
	if($("#id-dropdown-liga").is(':visible')
	&& (Settings.Liga.Art == Globals.Art.Liga || Settings.Liga.Art == Globals.Art.Pokal)) {
		$("#id-dropdown-spieltag").show();
		$("#id-dropdown-spieltag").attr("id-dropdown-spieltag", Settings.Spieltag.Id);
		$("#id-dropdown-spieltag").attr("nr-dropdown-spieltag", Settings.Spieltag.Nummer);
		$("#id-dropdown-spieltag").attr("art-dropdown-spieltag", Settings.Spieltag.Art);
		$("#id-dropdown-spieltag").attr("index-dropdown-spieltag", Settings.Spieltag.Index);
		$("#id-dropdown-spieltag").html(Spieltag+" <span class=\"caret\"></span>");
	} else {
		$("#id-dropdown-spieltag").hide();
	}
	localStorage.setItem("Sportwinner.Settings", JSON.stringify(Settings));
}
function loadBezirkFavorit() {
	$("#id-dropdown-menu-bezirk-favorit").empty();
	if($("#id-dropdown-saison").is(':visible')) {
		$("#id-dropdown-menu-bezirk-favorit").append("<li class=\"menuitem-bezirk-favorit\" id=\"id-menuitem-bezirk-favorit-0\" id-menuitem-bezirk-favorit=\"0\" art-menuitem-bezirk-favorit=\""+Globals.Art.Bund+"\" index-menuitem-bezirk-favorit=\""+$("#id-dropdown-menu-bezirk-favorit").children().length+"\"><a href=\"javascript:;\">Bundesligen</a></li>");
		$("#id-dropdown-menu-bezirk-favorit").append("<li class=\"divider\"></li>");
		$("#id-dropdown-menu-bezirk-favorit").append("<li class=\"menuitem-bezirk-favorit\" id=\"id-menuitem-bezirk-favorit-0\" id-menuitem-bezirk-favorit=\"0\" art-menuitem-bezirk-favorit=\""+Globals.Art.Land+"\" index-menuitem-bezirk-favorit=\""+$("#id-dropdown-menu-bezirk-favorit").children().length+"\"><a href=\"javascript:;\">SKVB-Ligen</a></li>");

		$.post("/php/skvb/service.php", { 
			command: "GetBezirkArray", 
			id_saison: Settings.Saison.Id
		},
		function( data, status ) {
			if(data.length > 0) {
				$("#id-dropdown-menu-bezirk-favorit").append("<li class=\"divider\"></li>");
			}
			for (var i in data) {
				$("#id-dropdown-menu-bezirk-favorit").append("<li class=\"menuitem-bezirk-favorit\" id=\"id-menuitem-bezirk-favorit-"+data[i][0]+"\" id-menuitem-bezirk-favorit=\""+data[i][0]+"\" art-menuitem-bezirk-favorit=\""+Globals.Art.Bezirk+"\" index-menuitem-bezirk-favorit=\""+$("#id-dropdown-menu-bezirk-favorit").children().length+"\"><a href=\"javascript:;\">"+data[i][1]+"</a></li>");
			}
			initBezirkFavorit(0,Globals.Art.Land,2);
		}, "json" ).fail( function() {
			initBezirkFavorit(-1,-1,-1);
		});

	} else {
		initBezirkFavorit(-1,-1,-1);
	}	
}
function initBezirkFavorit(Id,Art,Index) {
	$("#id-dropdown-bezirk-favorit").removeAttr("id-dropdown-bezirk-favorit");
	$("#id-dropdown-bezirk-favorit").removeAttr("art-dropdown-bezirk-favorit");
	$("#id-dropdown-bezirk-favorit").removeAttr("index-dropdown-bezirk-favorit");
	if(Id > -1) {
		$("#id-dropdown-bezirk-favorit").show();
		$("#id-dropdown-bezirk-favorit").attr("id-dropdown-bezirk-favorit", Id);
		$("#id-dropdown-bezirk-favorit").attr("art-dropdown-bezirk-favorit", Art);
		$("#id-dropdown-bezirk-favorit").attr("index-dropdown-bezirk-favorit", Index);
		$("#id-dropdown-bezirk-favorit").html($("[index-menuitem-bezirk-favorit=\""+Index+"\"]").text()+" <span class=\"caret\"></span>");
	} else {
		$("#id-dropdown-bezirk-favorit").hide();
	}
	loadLigaFavorit();
}
function loadLigaFavorit() {
	$.post("/php/skvb/service.php", { 
		command: "GetLigaArray", 
		id_saison: Settings.Saison.Id,
		id_bezirk: $("#id-dropdown-bezirk-favorit").attr("id-dropdown-bezirk-favorit"),
		favorit: "",
		art: $("#id-dropdown-bezirk-favorit").attr("art-dropdown-bezirk-favorit")
	},
	function( data, status ) {	
		$("#id-table-favorit").bootstrapTable({
			columns: [{
				field: "99",
				align: "center",
				formatter: "cellFormaterFavorit"
			}, {
				field: "2",
				title: "<h style=\"color: SteelBlue; font-weight: normal;\">Ligen</h>",
				align: "left"
			}]
		});
		$("#id-table-favorit").bootstrapTable("load", data);
		$("#id-table-favorit").css({"border-bottom": "0px", overflow: "hidden"});
	}, "json" );
}
function loadSpielplan() {
	$.post("/php/skvb/service.php", { 
		command: "GetSpielplan",
		id_saison: Settings.Saison.Id || 0,
		id_liga: Settings.Liga.Id || 0
	},
	function( data, status ) {		
		if( data.length > 0 ) {				 
			$("#id-container-spielplan").empty();
			$("#id-container-spielplan").append("<table id=\"id-table-spielplan\" data-classes=\"table table-condensed table-hover\" data-row-style=\"rowStyleNowrap\" data-sort-name=\"0\" data-toggle=\"id-table-spielplan\" data-group-by=\"true\" data-group-by-field=\"0\"></table>");
			$("#id-table-spielplan").bootstrapTable({
				columns: [{
					field: "2",
					title: "<h style=\"color: SteelBlue; font-weight: normal;\">Nr.</h>", 
					align: "center",
					class: "less720px"
				}, {
					field: "3",
					title: "<h style=\"color: SteelBlue; font-weight: normal;\">Datum / Zeit</h>",
					align: "center",
					class: "less720px"
				}, {
					field: "4",
					title: "<h style=\"color: SteelBlue; font-weight: normal;\">Gastgeber</h>",
				}, {
					field: "5",
					title: "<h style=\"color: SteelBlue; font-weight: normal;\">Gast</h>",
				},{
					field: "6",
					title: "<h style=\"color: SteelBlue; font-weight: normal;\">Ergebnis</h>",
					align: "center"
				}]
			});
			$("#id-table-spielplan").bootstrapTable("load", data);
			$("#id-table-spielplan").css({"border-bottom": "0px"});
			setColor();
		}
	}, "json");
}
function loadBahnanlage() {
	$.post("/php/skvb/service.php", { 
		command: "GetBahnanlage",					 
		id_saison: Settings.Saison.Id || 0,
		id_liga: Settings.Liga.Id || 0
	},
	function( data, status ) {
		$("#id-container-bahnanlage").empty();
		$("#id-container-bahnanlage").append("<table id=\"id-table-bahnanlage\" data-classes=\"table table-condensed table-hover\" data-row-style=\"rowStyleNowrap\" data-sort-name=\"0\" data-toggle=\"id-table-bahnanlage\" data-group-by=\"true\" data-show-header=\"false\" data-group-by-field=\"0\"></table>");

		$("#id-table-bahnanlage").bootstrapTable({
			columns: [{
				field: "1",
				width: "50%",
				align: "left",
				class: "less720px",
				cellStyle: "cellStyleDefault",
				formatter: "cellFormaterBahnanlage1"
			}, {
				field: "2",
				width: "50%",
				align: "left",
				class: "less720px",
				cellStyle: "cellStyleDefault",
				formatter: "cellFormaterBahnanlage2"
			}]
		});
		$("#id-table-bahnanlage").bootstrapTable("load", data);
		$("#id-table-bahnanlage").css({"border-bottom": "0px"});
		setColor();
	}, "json");
}
function loadSchnitt() {
	var id_schnitt_art = Settings.Options.Schnitt.Art;
	var id_schnitt_sort = Settings.Options.Schnitt.Sort;
	var id_schnitt_anzahl = Settings.Options.Schnitt.Anzahl;
	
	//
	
	if(id_schnitt_art == "id-schnitt-art-einfach") {
		id_schnitt_art = "0";
	} else {
		id_schnitt_art = "1";
	}
	
	//
	
	if(id_schnitt_sort == "id-schnitt-sort-heim") {
		id_schnitt_sort = "1";
	} else {
		if(id_schnitt_sort == "id-schnitt-sort-ausw") {
			id_schnitt_sort = "2";
		} else {
			id_schnitt_sort = "0";
		}
	}
	
	// Schnitt laden
	//
	$.post("/php/skvb/service.php", { 
		command: "GetSchnitt",
		id_saison: Settings.Saison.Id || 0,
		id_klub: Settings.Liga.Art == Globals.Art.Schnitt ? Settings.Bezirk.Id : 0,
		id_liga: Settings.Liga.Id || 0,
		nr_spieltag: Settings.Spieltag.Nummer || 100,
		sort: id_schnitt_sort,
		anzahl: id_schnitt_anzahl
	},
	function( data, status ) {		
		$("#id-container-schnitt").empty();
		$("#id-container-schnitt").append("<table id=\"id-table-schnitt\" data-classes=\"table table-condensed table-hover\" data-row-style=\"rowStyleNowrap\" data-toggle=\"id-table-schnitt\" data-search=\"false\" data-striped=\"false\"></table>");
		
		if( Settings.Liga.Wertung == Globals.Art.Punkte ) {
			if( id_schnitt_art == "0" && id_schnitt_sort == "0" ) { // Einfache Schnittliste --> Gesamt
				$("#id-table-schnitt").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-schnitt-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Schnittliste</button>",
								colspan: "3",
								align: "center"
							}, {
								title: (id_schnitt_sort == "0" ? "<button id=\"id-button-schnitt-gesamt\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Gesamt</button>" : "<button id=\"id-button-schnitt-gesamt\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Gesamt</button>"),
								colspan: "3",
								align: "center"
							}
						],
						[
							{
								field: "0",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "1",
								title: "Spieler",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterSpieler"
							}, {
								field: "2",
								title: "Klub",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterPaddingLeft"
							}, {
								field: "6",
								title: "Sp.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive"
							}, {
								field: "9",
								title: "&#8709;",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "12",
								title: "MP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}
						]
					]
				});	
			}
			if( id_schnitt_art == "0" && id_schnitt_sort == "1" ) { // Einfache Schnittliste --> Heim
				$("#id-table-schnitt").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-schnitt-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Schnittliste</button>",
								colspan: "3",
								align: "center"
							}, {
								title: (id_schnitt_sort == "1" ? "<button id=\"id-button-schnitt-heim\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Heim</button>" : "<button id=\"id-button-schnitt-heim\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Heim</button>"),
								colspan: "3",
								align: "center"
							}
						],
						[
							{
								field: "0",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "1",
								title: "Spieler",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterSpieler"
							}, {
								field: "2",
								title: "Klub",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterPaddingLeft"
							}, {
								field: "4",
								title: "Sp.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive"
							}, {
								field: "7",
								title: "&#8709;",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "10",
								title: "MP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}
						]
					]
				});	
			}
			if( id_schnitt_art == "0" && id_schnitt_sort == "2" ) { // Einfache Schnittliste --> Ausw
				$("#id-table-schnitt").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-schnitt-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Schnittliste</button>",
								colspan: "3",
								align: "center"
							}, {
								title: (id_schnitt_sort == "2" ? "<button id=\"id-button-schnitt-ausw\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Auswärts</button>" : "<button id=\"id-button-schnitt-ausw\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Auswärts</button>"),
								colspan: "3",
								align: "center"
							}
						],
						[
							{
								field: "0",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "1",
								title: "Spieler",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterSpieler"
							}, {
								field: "2",
								title: "Klub",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterPaddingLeft"
							}, {
								field: "5",
								title: "Sp.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive"
							}, {
								field: "8",
								title: "&#8709;",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "11",
								title: "MP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}
						]
					]
				});
			}
			if( id_schnitt_art == "1" ) { // Erweiterte Schnittliste --> Gesamt, Heim, Auswärts
				$("#id-table-schnitt").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-schnitt-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Schnittliste</button>",
								colspan: "3",
								align: "center"
							}, {
								title: (id_schnitt_sort == "0" ? "<button id=\"id-button-schnitt-gesamt\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Gesamt</button>" : "<button id=\"id-button-schnitt-gesamt\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Gesamt</button>"),
								colspan: "3",
								align: "center",
								class: (id_schnitt_sort=="0"?"":"less720px")
							}, {
								title: (id_schnitt_sort == "1" ? "<button id=\"id-button-schnitt-heim\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Heim</button>" : "<button id=\"id-button-schnitt-heim\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Heim</button>"),
								colspan: "3",
								align: "center",
								class: (id_schnitt_sort=="1"?"":"less720px")
							}, {
								title: (id_schnitt_sort == "2" ? "<button id=\"id-button-schnitt-ausw\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Auswärts</button>" : "<button id=\"id-button-schnitt-ausw\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Auswärts</button>"),
								colspan: "3",
								align: "center",
								class: (id_schnitt_sort=="2"?"":"less720px")
							}, {
								title: "",
								colspan: "1",
								align: "center",
								class: "less720px"
							}
						],
						[
							{
								field: "0",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "1",
								title: "Spieler",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterSpieler"
							}, {
								field: "2",
								title: "Klub",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterPaddingLeft"
							}, {
								field: "6",
								title: "Sp.",
								align: "center",
								class: "info"+(id_schnitt_sort=="0"?"":" less720px"),
								cellStyle: (id_schnitt_sort=="0"?"cellStyleActive":"cellStyleActiveLess720px")
							}, {
								field: "9",
								title: "&#8709;",
								align: "center",
								class: "info"+(id_schnitt_sort=="0"?"":" less720px"),
								cellStyle: (id_schnitt_sort=="0"?"cellStyleDefault":"cellStyleDefaultLess720px")
							}, {
								field: "12",
								title: "MP",
								align: "center",
								class: "info"+(id_schnitt_sort=="0"?"":" less720px"),
								cellStyle: (id_schnitt_sort=="0"?"cellStyleDefault":"cellStyleDefaultLess720px")
							}, {
								field: "4",
								title: "Sp.",
								align: "center",
								class: "info"+(id_schnitt_sort=="1"?"":" less720px"),
								cellStyle: (id_schnitt_sort=="1"?"cellStyleActive":"cellStyleActiveLess720px")
							}, {
								field: "7",
								title: "&#8709;",
								align: "center",
								class: "info"+(id_schnitt_sort=="1"?"":" less720px"),
								cellStyle: (id_schnitt_sort=="1"?"cellStyleDefault":"cellStyleDefaultLess720px")
							}, {
								field: "10",
								title: "MP",
								align: "center",
								class: "info"+(id_schnitt_sort=="1"?"":" less720px"),
								cellStyle: (id_schnitt_sort=="1"?"cellStyleDefault":"cellStyleDefaultLess720px")
							}, {
								field: "5",
								title: "Sp.",
								align: "center",
								class: "info"+(id_schnitt_sort=="2"?"":" less720px"),
								cellStyle: (id_schnitt_sort=="2"?"cellStyleActive":"cellStyleActiveLess720px")
							}, {
								field: "8",
								title: "&#8709;",
								align: "center",
								class: "info"+(id_schnitt_sort=="2"?"":" less720px"),
								cellStyle: (id_schnitt_sort=="2"?"cellStyleDefault":"cellStyleDefaultLess720px")
							}, {
								field: "11",
								title: "MP",
								align: "center",
								class: "info"+(id_schnitt_sort=="2"?"":" less720px"),
								cellStyle: (id_schnitt_sort=="2"?"cellStyleDefault":"cellStyleDefaultLess720px")
							}, {
								field: "13",
								title: "Best",
								align: "center",
								class: "info less720px",
								cellStyle: "cellStyleDefaultLess720px"
							}
						]
					]
				});	
			}
		} else {
			if( id_schnitt_art == "0" && id_schnitt_sort == "0" ) { // Einfache Schnittliste --> Gesamt
				$("#id-table-schnitt").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-schnitt-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Schnittliste</button>",
								colspan: "3",
								align: "center"
							}, {
								title: (id_schnitt_sort == "0" ? "<button id=\"id-button-schnitt-gesamt\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Gesamt</button>" : "<button id=\"id-button-schnitt-gesamt\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Gesamt</button>"),
								colspan: "3",
								align: "center"
							}
						],
						[
							{
								field: "0",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "1",
								title: "Spieler",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterSpieler"
							}, {
								field: "2",
								title: "Klub",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterPaddingLeft"
							}, {
								field: "6",
								title: "Sp.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive"
							}, {
								field: "9",
								title: "&#8709;",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "13",
								title: "Best",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}
						]
					]
				});	
			}
			if( id_schnitt_art == "0" && id_schnitt_sort == "1" ) { // Einfache Schnittliste --> Heim
				$("#id-table-schnitt").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-schnitt-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Schnittliste</button>",
								colspan: "3",
								align: "center"
							}, {
								title: (id_schnitt_sort == "1" ? "<button id=\"id-button-schnitt-heim\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Heim</button>" : "<button id=\"id-button-schnitt-heim\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Heim</button>"),
								colspan: "3",
								align: "center"
							}
						],
						[
							{
								field: "0",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "1",
								title: "Spieler",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterSpieler"
							}, {
								field: "2",
								title: "Klub",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterPaddingLeft"
							}, {
								field: "4",
								title: "Sp.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive"
							}, {
								field: "7",
								title: "&#8709;",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "13",
								title: "Best",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}
						]
					]
				});	
			}
			if( id_schnitt_art == "0" && id_schnitt_sort == "2" ) { // Einfache Schnittliste --> Ausw
				$("#id-table-schnitt").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-schnitt-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Schnittliste</button>",
								colspan: "3",
								align: "center"
							}, {
								title: (id_schnitt_sort == "2" ? "<button id=\"id-button-schnitt-ausw\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Auswärts</button>" : "<button id=\"id-button-schnitt-ausw\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Auswärts</button>"),
								colspan: "3",
								align: "center"
							}
						],
						[
							{
								field: "0",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "1",
								title: "Spieler",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterSpieler"
							}, {
								field: "2",
								title: "Klub",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterPaddingLeft"
							}, {
								field: "5",
								title: "Sp.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive"
							}, {
								field: "8",
								title: "&#8709;",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "13",
								title: "Best",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}
						]
					]
				});
			}
			if( id_schnitt_art == "1" ) { // Erweiterte Schnittliste --> Gesamt, Heim, Auswärts
				$("#id-table-schnitt").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-schnitt-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Schnittliste</button>",
								colspan: "3",
								align: "center"
							}, {
								title: (id_schnitt_sort == "0" ? "<button id=\"id-button-schnitt-gesamt\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Gesamt</button>" : "<button id=\"id-button-schnitt-gesamt\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Gesamt</button>"),
								colspan: "2",
								align: "center",
								class: (id_schnitt_sort=="0"?"":"less720px")
							}, {
								title: (id_schnitt_sort == "1" ? "<button id=\"id-button-schnitt-heim\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Heim</button>" : "<button id=\"id-button-schnitt-heim\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Heim</button>"),
								colspan: "2",
								align: "center",
								class: (id_schnitt_sort=="1"?"":"less720px")
							}, {
								title: (id_schnitt_sort == "2" ? "<button id=\"id-button-schnitt-ausw\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Auswärts</button>" : "<button id=\"id-button-schnitt-ausw\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Auswärts</button>"),
								colspan: "2",
								align: "center",
								class: (id_schnitt_sort=="2"?"":"less720px")
							}, {
								title: "",
								colspan: "1",
								align: "center"
							}
						],
						[
							{
								field: "0",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "1",
								title: "Spieler",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterSpieler"
							}, {
								field: "2",
								title: "Klub",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterPaddingLeft"
							}, {
								field: "6",
								title: "Sp.",
								align: "center",
								class: "info"+(id_schnitt_sort=="0"?"":" less720px"),
								cellStyle: (id_schnitt_sort=="0"?"cellStyleActive":"cellStyleActiveLess720px")
							}, {
								field: "9",
								title: "&#8709;",
								align: "center",
								class: "info"+(id_schnitt_sort=="0"?"":" less720px"),
								cellStyle: (id_schnitt_sort=="0"?"cellStyleDefault":"cellStyleDefaultLess720px")
							}, {
								field: "4",
								title: "Sp.",
								align: "center",
								class: "info"+(id_schnitt_sort=="1"?"":" less720px"),
								cellStyle: (id_schnitt_sort=="1"?"cellStyleActive":"cellStyleActiveLess720px")
							}, {
								field: "7",
								title: "&#8709;",
								align: "center",
								class: "info"+(id_schnitt_sort=="1"?"":" less720px"),
								cellStyle: (id_schnitt_sort=="1"?"cellStyleDefault":"cellStyleDefaultLess720px")
							}, {
								field: "5",
								title: "Sp.",
								align: "center",
								class: "info"+(id_schnitt_sort=="2"?"":" less720px"),
								cellStyle: (id_schnitt_sort=="2"?"cellStyleActive":"cellStyleActiveLess720px")
							}, {
								field: "8",
								title: "&#8709;",
								align: "center",
								class: "info"+(id_schnitt_sort=="2"?"":" less720px"),
								cellStyle: (id_schnitt_sort=="2"?"cellStyleDefault":"cellStyleDefaultLess720px")
							}, {
								field: "13",
								title: "Best",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}
						]
					]
				});	
			}
		}
		$("#id-table-schnitt").bootstrapTable("load", data);
		$("#id-table-schnitt").css({"border-bottom": "0px"});
		setColor();
	}, "json");
}
function loadTabelle() {
	var id_tabelle_art = Settings.Options.Tabelle.Art;
	var id_tabelle_sort = Settings.Options.Tabelle.Sort;
	
	//
	
	if(id_tabelle_art == "id-tabelle-art-einfach") {
		id_tabelle_art = "0";
	} else {
		if(id_tabelle_art == "id-tabelle-art-direktvergleich") {
			id_tabelle_art = "1";
		} else {
			id_tabelle_art = "2";
		}
	}
	
	//
	
	if(id_tabelle_sort == "id-tabelle-sort-heim") {
		id_tabelle_sort = "1";
	} else {
		if(id_tabelle_sort == "id-tabelle-sort-ausw") {
			id_tabelle_sort = "2";
		} else {
			id_tabelle_sort = "0";
		}
	}

	// Tabelle laden
	//	
	$.post("/php/skvb/service.php", { 
		command: "GetTabelle",
		id_saison: Settings.Saison.Id || 0,
		id_liga: Settings.Liga.Id || 0,
		nr_spieltag: Settings.Spieltag.Nummer || 100,
		sort: id_tabelle_sort
	},
	function( data, status ) {
		$("#id-container-tabelle").empty();
		$("#id-container-tabelle").append("<table id=\"id-table-tabelle\" data-classes=\"table table-condensed table-hover\" data-row-style=\"rowStyleNowrap\" data-toggle=\"id-table-tabelle\"></table>");
		
		if( Settings.Liga.Wertung == Globals.Art.Punkte ) {
			if( id_tabelle_art == "0" && id_tabelle_sort == "0" ) { // Einfache Tabelle --> Gesamt
				$("#id-table-tabelle").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-tabelle-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Tabelle</button>",
								colspan: "2",
								align: "center"
							}, {
								title: "<button id=\"id-button-tabelle-gesamt\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Gesamt</button>",
								colspan: "3",
								align: "center"
							}
						],
						[
							{
								field: "1",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "2",
								title: "Mannschaft",
								align: "left",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterMannschaft"
							}, {
								field: "4",
								title: "Sp.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive"
							}, {
								field: "7",
								title: "TP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterTPG120"
							}, {
								field: "13",
								title: "MP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}
						]
					]
				});
			}
			if( id_tabelle_art == "0" && id_tabelle_sort == "1" ) { // Einfache Tabelle --> Heim
				$("#id-table-tabelle").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-tabelle-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Tabelle</button>",
								colspan: "2",
								align: "center"
							}, {
								title: "<button id=\"id-button-tabelle-heim\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Heim</button>",
								colspan: "3",
								align: "center"
							}
						],
						[
							{
								field: "1",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "2",
								title: "Mannschaft",
								align: "left",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterMannschaft"
							}, {
								field: "5",
								title: "Sp.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive"
							}, {
								field: "8",
								title: "TP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterTPH120"
							}, {
								field: "14",
								title: "MP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}
						]
					]
				});
			}
			if( id_tabelle_art == "0" && id_tabelle_sort == "2" ) { // Einfache Tabelle --> Auswärts
				$("#id-table-tabelle").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-tabelle-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Tabelle</button>",
								colspan: "2",
								align: "center"
							}, {
								title: "<button id=\"id-button-tabelle-ausw\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Auswärts</button>",
								colspan: "3",
								align: "center"
							}
						],
						[
							{
								field: "1",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "2",
								title: "Mannschaft",
								align: "left",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterMannschaft"
							}, {
								field: "6",
								title: "Sp.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive"
							}, {
								field: "9",
								title: "TP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterTPA120"
							}, {
								field: "15",
								title: "MP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}
						]
					]
				});
			}
			if( id_tabelle_art == "1" && id_tabelle_sort == "0" ) { // Direktvergleich --> Gesamt
				$("#id-table-tabelle").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-tabelle-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Tabelle</button>",
								colspan: "2",
								align: "center"
							}, {
								title: "<button id=\"id-button-tabelle-gesamt\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Gesamt</button>",
								colspan: "3",
								align: "center"
							}, {
								title: "<h style=\"color: SteelBlue; font-weight: normal;\">Direktvergleich</h>",
								colspan: "3",
								align: "center"
							}
							
						],
						[
							{
								field: "1",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "2",
								title: "Mannschaft",
								align: "left",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterMannschaft"
							}, {
								field: "4",
								title: "Sp.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive"
							}, {
								field: "7",
								title: "TP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterTPG120"
							}, {
								field: "13",
								title: "MP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "19",
								title: "TP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "22",
								title: "MP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "25",
								title: "SP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}
						]
					]
				});
			}
			if( id_tabelle_art == "1" && id_tabelle_sort == "1" ) { // Direktvergleich --> Heim
				$("#id-table-tabelle").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-tabelle-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Tabelle</button>",
								colspan: "2",
								align: "center"
							}, {
								title: "<button id=\"id-button-tabelle-heim\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Heim</button>",
								colspan: "3",
								align: "center"
							}, {
								title: "<h style=\"color: SteelBlue; font-weight: normal;\">Direktvergleich</h>",
								colspan: "3",
								align: "center"
							}
							
						],
						[
							{
								field: "1",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "2",
								title: "Mannschaft",
								align: "left",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterMannschaft"
							}, {
								field: "5",
								title: "Sp.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive"
							}, {
								field: "8",
								title: "TP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterTPH120"
							}, {
								field: "14",
								title: "MP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "20",
								title: "TP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "23",
								title: "MP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "26",
								title: "SP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}
						]
					]
				});
			}
			if( id_tabelle_art == "1" && id_tabelle_sort == "2" ) { // Direktvergleich --> Auswärts
				$("#id-table-tabelle").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-tabelle-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Tabelle</button>",
								colspan: "2",
								align: "center"
							}, {
								title: "<button id=\"id-button-tabelle-ausw\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Auswärts</button>",
								colspan: "3",
								align: "center"
							}, {
								title: "<span style=\"color: SteelBlue; font-weight: normal;\">Direktvergleich</span>",
								colspan: "3",
								align: "center"
							}
							
						],
						[
							{
								field: "1",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "2",
								title: "Mannschaft",
								align: "left",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterMannschaft"
							}, {
								field: "6",
								title: "Sp.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive"
							}, {
								field: "9",
								title: "TP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterTPA120"
							}, {
								field: "15",
								title: "MP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "21",
								title: "TP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "24",
								title: "MP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "27",
								title: "SP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}
						]
					]
				});
			}
			if( id_tabelle_art == "2" ) { // Erweiterte Tabelle --> Gesamt, Heim, Auswärts
				$("#id-table-tabelle").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-tabelle-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Tabelle</button>",
								colspan: "2",
								align: "center"
							}, {
								title: (id_tabelle_sort == "0" ? "<button id=\"id-button-tabelle-gesamt\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Gesamt</button>" : "<button id=\"id-button-tabelle-gesamt\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Gesamt</button>"),
								colspan: "3",
								align: "center",
								class: (id_tabelle_sort=="0"?"":"less720px")
							}, {
								title: (id_tabelle_sort == "1" ? "<button id=\"id-button-tabelle-heim\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Heim</button>" : "<button id=\"id-button-tabelle-heim\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Heim</button>"),
								colspan: "3",
								align: "center",
								class: (id_tabelle_sort=="1"?"":"less720px")
							}, {
								title: (id_tabelle_sort == "2" ? "<button id=\"id-button-tabelle-ausw\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Auswärts</button>" : "<button id=\"id-button-tabelle-ausw\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Auswärts</button>"),
								colspan: "3",
								align: "center",
								class: (id_tabelle_sort=="2"?"":"less720px")
							}
						],
						[
							{
								field: "1",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "2",
								title: "Mannschaft",
								align: "left",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterMannschaft"
							}, {
								field: "4",
								title: "Sp.",
								align: "center",
								class: "info"+(id_tabelle_sort=="0"?"":" less720px"),
								cellStyle: (id_tabelle_sort=="0"?"cellStyleActive":"cellStyleActiveLess720px")
							}, {
								field: "7",
								title: "TP",
								align: "center",
								class: "info"+(id_tabelle_sort=="0"?"":" less720px"),
								cellStyle: (id_tabelle_sort=="0"?"cellStyleDefault":"cellStyleDefaultLess720px"),
								formatter: "cellFormaterTPG120"
							}, {
								field: "13",
								title: "MP",
								align: "center",
								class: "info"+(id_tabelle_sort=="0"?"":" less720px"),
								cellStyle: (id_tabelle_sort=="0"?"cellStyleDefault":"cellStyleDefaultLess720px")
							}, {
								field: "5",
								title: "Sp.",
								align: "center",
								class: "info"+(id_tabelle_sort=="1"?"":" less720px"),
								cellStyle: (id_tabelle_sort=="1"?"cellStyleActive":"cellStyleActiveLess720px")
							}, {
								field: "8",
								title: "TP",
								align: "center",
								class: "info"+(id_tabelle_sort=="1"?"":" less720px"),
								cellStyle: (id_tabelle_sort=="1"?"cellStyleDefault":"cellStyleDefaultLess720px"),
								formatter: "cellFormaterTPH120"
							}, {
								field: "14",
								title: "MP",
								align: "center",
								class: "info"+(id_tabelle_sort=="1"?"":" less720px"),
								cellStyle: (id_tabelle_sort=="1"?"cellStyleDefault":"cellStyleDefaultLess720px")
							}, {
								field: "6",
								title: "Sp.",
								align: "center",
								class: "info"+(id_tabelle_sort=="2"?"":" less720px"),
								cellStyle: (id_tabelle_sort=="2"?"cellStyleActive":"cellStyleActiveLess720px")
							}, {
								field: "9",
								title: "TP",
								align: "center",
								class: "info"+(id_tabelle_sort=="2"?"":" less720px"),
								cellStyle: (id_tabelle_sort=="2"?"cellStyleDefault":"cellStyleDefaultLess720px"),
								formatter: "cellFormaterTPA120"
							}, {
								field: "15",
								title: "MP",
								align: "center",
								class: "info"+(id_tabelle_sort=="2"?"":" less720px"),
								cellStyle: (id_tabelle_sort=="2"?"cellStyleDefault":"cellStyleDefaultLess720px")
							}
						]
					]
				});
			}
		} else {
			if( id_tabelle_art == "0" && id_tabelle_sort == "0" ) { // Einfache Tabelle --> Gesamt
				$("#id-table-tabelle").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-tabelle-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Tabelle</button>",
								colspan: "2",
								align: "center"
							}, {
								title: "<h style=\"color: SteelBlue; font-weight: normal;\">Anzahl</h>",
								colspan: "4",
								align: "center"
							}, {
								title: "<button id=\"id-button-tabelle-gesamt\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Gesamt</button>",
								colspan: "2",
								align: "center"
							}
						],
						[
							{
								field: "1",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "2",
								title: "Mannschaft",
								align: "left",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterMannschaft"
							}, {
								field: "4",
								title: "Sp",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive"
							}, {
								field: "7",
								title: "S",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "10",
								title: "U",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "13",
								title: "N",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "16",
								title: "SWP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive",
								formatter: "cellFormaterTPG"
							}, {
								field: "22",
								title: "Kegel",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}
						]
					]
				});
			}
			if( id_tabelle_art == "0" && id_tabelle_sort == "1" ) { // Einfache Tabelle --> Heim
				$("#id-table-tabelle").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-tabelle-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Tabelle</button>",
								colspan: "2",
								align: "center"
							}, {
								title: "<h style=\"color: SteelBlue; font-weight: normal;\">Anzahl</h>",
								colspan: "4",
								align: "center"
							}, {
								title: "<button id=\"id-button-tabelle-heim\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Heim</button>",
								colspan: "2",
								align: "center"
							}
						], 
						[
							{
								field: "1",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "2",
								title: "Mannschaft",
								align: "left",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterMannschaft"
							}, {
								field: "5",
								title: "Sp",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive"
							}, {
								field: "8",
								title: "S",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "11",
								title: "U",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "14",
								title: "N",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "17",
								title: "SWP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive",
								formatter: "cellFormaterTPH"
							}, {
								field: "23",
								title: "Kegel",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}
						]
					]
				});
			}
			if( id_tabelle_art == "0" && id_tabelle_sort == "2" ) { // Einfache Tabelle --> Auswärts
				$("#id-table-tabelle").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-tabelle-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Tabelle</button>",
								colspan: "2",
								align: "center"
							}, {
								title: "<h style=\"color: SteelBlue; font-weight: normal;\">Anzahl</h>",
								colspan: "4",
								align: "center"
							}, {
								title: "<button id=\"id-button-tabelle-ausw\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Auswärts</button>",
								colspan: "2",
								align: "center"
							}
						],
						[
							{
								field: "1",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "2",
								title: "Mannschaft",
								align: "left",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterMannschaft"
							}, {
								field: "6",
								title: "Sp",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive"
							}, {
								field: "9",
								title: "S",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "12",
								title: "U",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "15",
								title: "N",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "18",
								title: "SWP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive",
								formatter: "cellFormaterTPA"
							}, {
								field: "24",
								title: "Kegel",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}
						]
					]
				});
			}
			if( id_tabelle_art == "1" && id_tabelle_sort == "0" ) { // Direktvergleich --> Gesamt
				$("#id-table-tabelle").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-tabelle-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Tabelle</button>",
								colspan: "2",
								align: "center"
							}, {
								title: "<h style=\"color: SteelBlue; font-weight: normal;\">Anzahl</h>",
								colspan: "4",
								align: "center",
								class: "less720px"
							}, {
								title: "<button id=\"id-button-tabelle-gesamt\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Gesamt</button>",
								colspan: "2",
								align: "center"
							}, {
								title: "<h style=\"color: SteelBlue; font-weight: normal;\">D.Vergleich</h>",
								colspan: "2",
								align: "center"
							}
						],
						[
							{
								field: "1",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "2",
								title: "Mannschaft",
								align: "left",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterMannschaft"
							}, {
								field: "4",
								title: "Sp",
								align: "center",
								class: "info less720px",
								cellStyle: "cellStyleActiveLess720px"
							}, {
								field: "7",
								title: "S",
								align: "center",
								class: "info less720px",
								cellStyle: "cellStyleDefaultLess720px"
							}, {
								field: "10",
								title: "U",
								align: "center",
								class: "info less720px",
								cellStyle: "cellStyleDefaultLess720px"
							}, {
								field: "13",
								title: "N",
								align: "center",
								class: "info less720px",
								cellStyle: "cellStyleDefaultLess720px"
							}, {
								field: "16",
								title: "SWP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive",
								formatter: "cellFormaterTPG"
							}, {
								field: "22",
								title: "Kegel",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "25",
								title: "SWP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive",
								formatter: "cellFormaterTPGDV"
							}, {
								field: "31",
								title: "Diff.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}
						]
					]
				});
			}
			if( id_tabelle_art == "1" && id_tabelle_sort == "1" ) { // Direktvergleich --> Heim
				$("#id-table-tabelle").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-tabelle-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Tabelle</button>",
								colspan: "2",
								align: "center"
							}, {
								title: "<h style=\"color: SteelBlue; font-weight: normal;\">Anzahl</h>",
								colspan: "4",
								align: "center",
								class: "less720px"
							}, {
								title: "<button id=\"id-button-tabelle-gesamt\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Heim</button>",
								colspan: "2",
								align: "center"
							}, {
								title: "<h style=\"color: SteelBlue; font-weight: normal;\">D.Vergleich</h>",
								colspan: "2",
								align: "center"
							}
						],
						[
							{
								field: "1",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "2",
								title: "Mannschaft",
								align: "left",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterMannschaft"
							}, {
								field: "5",
								title: "Sp",
								align: "center",
								class: "info less720px",
								cellStyle: "cellStyleActiveLess720px"
							}, {
								field: "8",
								title: "S",
								align: "center",
								class: "info less720px",
								cellStyle: "cellStyleDefaultLess720px"
							}, {
								field: "11",
								title: "U",
								align: "center",
								class: "info less720px",
								cellStyle: "cellStyleDefaultLess720px"
							}, {
								field: "14",
								title: "N",
								align: "center",
								class: "info less720px",
								cellStyle: "cellStyleDefaultLess720px"
							}, {
								field: "17",
								title: "SWP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive",
								formatter: "cellFormaterTPH"
							}, {
								field: "23",
								title: "Kegel",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "26",
								title: "SWP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive",
								formatter: "cellFormaterTPHDV"
							}, {
								field: "32",
								title: "Diff.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}
						]
					]
				});
			}
			if( id_tabelle_art == "1" && id_tabelle_sort == "2" ) { // Direktvergleich --> Auswärts
				$("#id-table-tabelle").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-tabelle-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Tabelle</button>",
								colspan: "2",
								align: "center"
							}, {
								title: "<h style=\"color: SteelBlue; font-weight: normal;\">Anzahl</h>",
								colspan: "4",
								align: "center",
								class: "less720px"
							}, {
								title: "<button id=\"id-button-tabelle-ausw\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Auswärts</button>",
								colspan: "2",
								align: "center"
							}, {
								title: "<h style=\"color: SteelBlue; font-weight: normal;\">D.Vergleich</h>",
								colspan: "2",
								align: "center"
							}
						],
						[
							{
								field: "1",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "2",
								title: "Mannschaft",
								align: "left",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterMannschaft"
							}, {
								field: "6",
								title: "Sp",
								align: "center",
								class: "info less720px",
								cellStyle: "cellStyleActiveLess720px"
							}, {
								field: "9",
								title: "S",
								align: "center",
								class: "info less720px",
								cellStyle: "cellStyleDefaultLess720px"
							}, {
								field: "12",
								title: "U",
								align: "center",
								class: "info less720px",
								cellStyle: "cellStyleDefaultLess720px"
							}, {
								field: "15",
								title: "N",
								align: "center",
								class: "info less720px",
								cellStyle: "cellStyleDefaultLess720px"
							}, {
								field: "18",
								title: "SWP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive",
								formatter: "cellFormaterTPA"
							}, {
								field: "24",
								title: "Kegel",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "27",
								title: "SWP",
								align: "center",
								class: "info",
								cellStyle: "cellStyleActive",
								formatter: "cellFormaterTPADV"
							}, {
								field: "33",
								title: "Diff.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}
						]
					]
				});
			}
			if( id_tabelle_art == "2" ) { // Erweiterte Tabelle --> Gesamt, Heim, Auswärts
				$("#id-table-tabelle").bootstrapTable({
					columns: 
					[
						[
							{
								title: "<button id=\"id-button-tabelle-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Tabelle</button>",
								colspan: "2",
								align: "center"
							}, {
								title: (id_tabelle_sort == "0" ? "<button id=\"id-button-tabelle-gesamt\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Gesamt</button>" : "<button id=\"id-button-tabelle-gesamt\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Gesamt</button>"),
								colspan: "3",
								align: "center",
								class: (id_tabelle_sort=="0"?"":"less720px")
							}, {
								title: (id_tabelle_sort == "1" ? "<button id=\"id-button-tabelle-heim\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Heim</button>" : "<button id=\"id-button-tabelle-heim\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Heim</button>"),
								colspan: "3",
								align: "center",
								class: (id_tabelle_sort=="1"?"":"less720px")
							}, {
								title: (id_tabelle_sort == "2" ? "<button id=\"id-button-tabelle-ausw\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Auswärts</button>" : "<button id=\"id-button-tabelle-ausw\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Auswärts</button>"),
								colspan: "3",
								align: "center",
								class: (id_tabelle_sort=="2"?"":"less720px")
							}
						],
						[
							{
								field: "1",
								title: "Pl.",
								align: "center",
								class: "info",
								cellStyle: "cellStyleDefault"
							}, {
								field: "2",
								title: "Mannschaft",
								align: "left",
								class: "info",
								cellStyle: "cellStyleDefault",
								formatter: "cellFormaterMannschaft"
							}, {
								field: "4",
								title: "Sp",
								align: "center",
								class: "info"+(id_tabelle_sort=="0"?"":" less720px"),
								cellStyle: (id_tabelle_sort=="0"?"cellStyleActive":"cellStyleActiveLess720px")
							}, {
								field: "16",
								title: "SWP",
								align: "center",
								class: "info"+(id_tabelle_sort=="0"?"":" less720px"),
								cellStyle: (id_tabelle_sort=="0"?"cellStyleDefault":"cellStyleDefaultLess720px")
							}, {
								field: "22",
								title: "Kegel",
								align: "center",
								class: "info"+(id_tabelle_sort=="0"?"":" less720px"),
								cellStyle: (id_tabelle_sort=="0"?"cellStyleDefault":"cellStyleDefaultLess720px")
							}, {
								field: "5",
								title: "Sp",
								align: "center",
								class: "info"+(id_tabelle_sort=="1"?"":" less720px"),
								cellStyle: (id_tabelle_sort=="1"?"cellStyleActive":"cellStyleActiveLess720px")
							}, {
								field: "17",
								title: "SWP",
								align: "center",
								class: "info"+(id_tabelle_sort=="1"?"":" less720px"),
								cellStyle: (id_tabelle_sort=="1"?"cellStyleDefault":"cellStyleDefaultLess720px")
							}, {
								field: "23",
								title: "Kegel",
								align: "center",
								class: "info"+(id_tabelle_sort=="1"?"":" less720px"),
								cellStyle: (id_tabelle_sort=="1"?"cellStyleDefault":"cellStyleDefaultLess720px")
							}, {
								field: "6",
								title: "Sp",
								align: "center",
								class: "info"+(id_tabelle_sort=="2"?"":" less720px"),
								cellStyle: (id_tabelle_sort=="2"?"cellStyleDefault":"cellStyleDefaultLess720px")
							}, {
								field: "18",
								title: "SWP",
								align: "center",
								class: "info"+(id_tabelle_sort=="2"?"":" less720px"),
								cellStyle: (id_tabelle_sort=="2"?"cellStyleDefault":"cellStyleDefaultLess720px")
							}, {
								field: "24",
								title: "Kegel",
								align: "center",
								class: "info"+(id_tabelle_sort=="2"?"":" less720px"),
								cellStyle: (id_tabelle_sort=="2"?"cellStyleDefault":"cellStyleDefaultLess720px")
							}
						]
					]
				});
			}
		}
		$("#id-table-tabelle").bootstrapTable("load", data);
		$("#id-table-tabelle").css({"border-bottom": "0px"});
		setColor();
	}, "json");
}
function loadSpiel() {
	var Favorit = "";
	if(Settings.Bezirk.Art == Globals.Art.Favorit) {
		for( var i=0; i < Settings.Favorit.length; i++ ) {
			if(i>0) { Favorit += ", " }
			Favorit += Settings.Favorit[i].Liga;
		}
	}
	var Klub = "0";
	if( Settings.Bezirk.Art == Globals.Art.Klub ) {
		Klub = Settings.Bezirk.Id;
	}
	var Bezirk = "0";
	if( Settings.Bezirk.Art == Globals.Art.Bezirk ) {
		Bezirk = Settings.Bezirk.Id;
	}
	$.post("/php/skvb/service.php", { 
		command: "GetSpiel",
		id_saison: Settings.Saison.Id,
		id_klub: Klub,			   
		id_bezirk: Bezirk,
		id_liga: Settings.Liga.Id || 0,
		id_spieltag: Settings.Spieltag.Id || 0,
		favorit: Favorit,
		art_bezirk: Settings.Bezirk.Art || 0,
		art_liga: Settings.Liga.Art || 0,
		art_spieltag: Settings.Spieltag.Art || 0
	},
	function( data, status ) {		
		$("#id-container-ergebnisse").append("<table id=\"id-table-spiel\" data-classes=\"table table-condensed table-hover\" data-row-style=\"rowStyleNowrap\" data-toggle=\"id-table-spiel\" data-show-header=\"false\" data-detail-view=\"true\" data-detail-formatter=\"detailFormatter\" data-unique-id=\"0\" data-undefined-text=\"\"></table>");
		
		if( Settings.Liga.Wertung == Globals.Art.Punkte ) {
			$("#id-table-spiel").bootstrapTable({
				columns: [{
					field: "0"
				}, {
					field: "3",
					title: "Gastgeber",
					width: "50%",
					formatter: "cellFormaterSpielGG"
				}, {
					field: "4",
					title: "MP",
					align: "center",
					class: "active mp-width",
					cellStyle: "cellStyleMP"
				}, {
					field: "99",
					align: "center",
					width: "5",
					cellStyle: "cellStyleDefault"
				}, {
					field: "5",
					title: "MP",
					align: "center",
					class: "active mp-width",
					cellStyle: "cellStyleMP"
				}, {
					field: "6",
					title: "Gast",
					width: "50%",
					formatter: "cellFormaterSpielG"
				}, {
					field: "7",
					title: "Status",
					align: "center",
					formatter: "cellFormaterES"
				}]
			});
		} else {
			$("#id-table-spiel").bootstrapTable({
				columns: [{
					field: "0"
				}, {
					field: "3",
					title: "Gastgeber",
					width: "50%",
					formatter: "cellFormaterSpielGG"
				}, {
					field: "4",
					title: "Holz",
					align: "center",
					class: "active kegel-width",
					cellStyle: "cellStyleHolzGG"
				}, {
					field: "99",
					align: "center",
					width: "5",
					cellStyle: "cellStyleDefault"
				}, {
					field: "5",
					title: "Holz",
					align: "center",
					class: "active kegel-width",
					cellStyle: "cellStyleHolzG"
				}, {
					field: "6",
					title: "Gast",
					width: "50%",
					formatter: "cellFormaterSpielG"
				}, {
					field: "7",
					title: "Status",
					align: "center",
					formatter: "cellFormaterES"
				}]
			});
		}
		$("#id-table-spiel").bootstrapTable("hideColumn", "0");
		$("#id-table-spiel").bootstrapTable("load", data);
		$("#id-table-spiel").css({"border-bottom": "0px", "table-layout": "fixed"});
		$("#id-table-spiel td").css({"overflow": "hidden", "text-overflow": "ellipsis"});
		$("#id-table-spiel td:eq(0)").addClass("collaps-status-width");
		$("#id-table-spiel td:eq(6)").addClass("collaps-status-width");
		$(".detail-icon").parent().css({"text-align": "center"});
		$("#id-table-spiel th").addClass("info");
		setColor();
	}, "json");
	Globals.Ticker.Id = setInterval( function() { 
		startTicker(Settings.Saison.Id, Klub, Bezirk, Settings.Liga.Id || 0, Settings.Spieltag.Id || 0, Favorit, Settings.Bezirk.Art || 0, Settings.Liga.Art || 0, Settings.Spieltag.Art || 0); 
	}, (60000*3) );
}
function loadSpieltagBester() {
	var spieltagbester_sort = "2";
	if(Settings.Options.Spieltagbester.Sort == "id-spieltagbester-sort-gesamt") {
		spieltagbester_sort = "0";
	} else {
		if(Settings.Options.Spieltagbester.Sort == "id-spieltagbester-sort-heim") {
			spieltagbester_sort = "1";
		}
	}
	
	//
	
	if( !Settings.Options.Spieltagbester.Anzahl 
	|| isNaN(Settings.Options.Spieltagbester.Anzahl)) {
		Settings.Options.Spieltagbester.Anzahl = 5;
	}
	if( Settings.Options.Spieltagbester.Anzahl < 1 ) {
		Settings.Options.Spieltagbester.Anzahl = 5;
	}
    if( Settings.Options.Spieltagbester.Anzahl > 10 ) {
		Settings.Options.Spieltagbester.Anzahl = 10;
	}
	
	//
	
	$.post("/php/skvb/service.php", { 
		command: "GetSpieltagBester",
		id_saison: Settings.Saison.Id || 0,
		id_liga: Settings.Liga.Id || 0,
		id_spieltag: Settings.Spieltag.Id || 0,
		sort: spieltagbester_sort,
		anzahl: Settings.Options.Spieltagbester.Anzahl
	},
	function( data, status ) {			
		if( data.length > 0 ) {				   
			$("#id-container-spieltagbester").empty();
			$("#id-container-spieltagbester").append("<table id=\"id-table-spieltagbester\" data-classes=\"table table-condensed table-hover\" data-row-style=\"rowStyleNowrap\" data-toggle=\"id-table-spieltagbester\" data-search=\"false\" data-striped=\"false\"></table>");
			$("#id-table-spieltagbester").bootstrapTable({
				columns: 
				[
					[
						{
							title: "<button id=\"id-button-spieltagbester-option\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-cog icon-th\"></i> Spieltagbester</button>",
							colspan: "3",
							align: "center"
						}, {
							title: (spieltagbester_sort == "0" ? "<button id=\"id-button-spieltagbester-gesamt\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Gesamt</button>" : "<button id=\"id-button-spieltagbester-gesamt\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Gesamt</button>"),
							colspan: "2",
							align: "center",
							class: (spieltagbester_sort=="0"?"":"less720px")
						}, {
							title: (spieltagbester_sort == "1" ? "<button id=\"id-button-spieltagbester-heim\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Heim</button>" : "<button id=\"id-button-spieltagbester-heim\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Heim</button>"),
							colspan: "2",
							align: "center",
							class: (spieltagbester_sort=="1"?"":"less720px")
						}, {
							title: (spieltagbester_sort == "2" ? "<button id=\"id-button-spieltagbester-ausw\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\"><i class=\"glyphicon glyphicon-star\"></i> Auswärts</button>" : "<button id=\"id-button-spieltagbester-ausw\" type=\"button\" class=\"btn btn-default\" style=\"color: SteelBlue; border: 0px; padding: 0px;\">Auswärts</button>"),
							colspan: "2",
							align: "center",
							class: (spieltagbester_sort=="2"?"":"less720px")
						}
					],
					[
						{
							field: "0",
							title: "Pl.",
							align: "center",
							class: "info",
							cellStyle: "cellStyleDefault"
						}, {
							field: "1",
							title: "Spieler",
							class: "info",
							cellStyle: "cellStyleDefault",
							formatter: "cellFormaterSpieler"
						}, {
							field: "2",
							title: "Klub",
							class: "info",
							cellStyle: "cellStyleDefault",
							formatter: "cellFormaterPaddingLeft"
						}, {
							field: "4",
							title: "Kegel",
							align: "center",
							class: "info"+(spieltagbester_sort=="0"?"":" less720px"),
							cellStyle: (spieltagbester_sort=="0"?"cellStyleActive":"cellStyleActiveLess720px")
						}, {
							field: "5",
							title: "Abr",
							align: "center",
							class: "info"+(spieltagbester_sort=="0"?"":" less720px"),
							cellStyle: (spieltagbester_sort=="0"?"cellStyleDefault":"cellStyleDefaultLess720px")
						}, {
							field: "6",
							title: "Kegel",
							align: "center",
							class: "info"+(spieltagbester_sort=="1"?"":" less720px"),
							cellStyle: (spieltagbester_sort=="1"?"cellStyleActive":"cellStyleActiveLess720px")
						}, {
							field: "7",
							title: "Abr",
							align: "center",
							class: "info"+(spieltagbester_sort=="1"?"":" less720px"),
							cellStyle: (spieltagbester_sort=="1"?"cellStyleDefault":"cellStyleDefaultLess720px")
						}, {
							field: "8",
							title: "Kegel",
							align: "center",
							class: "info"+(spieltagbester_sort=="2"?"":" less720px"),
							cellStyle: (spieltagbester_sort=="2"?"cellStyleActive":"cellStyleActiveLess720px")
						}, {
							field: "9",
							title: "Abr",
							align: "center",
							class: "info"+(spieltagbester_sort=="2"?"":" less720px"),
							cellStyle: (spieltagbester_sort=="2"?"cellStyleDefault":"cellStyleDefaultLess720px")
						}
					]
				]
			});	
			$("#id-table-spieltagbester").bootstrapTable("load", data);
			$("#id-table-spieltagbester").css({"border-bottom": "0px"});
			setColor();
		}
	}, "json");
}
function loadRekord() {
	$.post("/php/skvb/service.php", { 
		command: "GetRekord",
		id_saison: Settings.Saison.Id || 0,
		id_liga: Settings.Liga.Id || 0,
		nr_spieltag: Settings.Spieltag.Nummer || 100
	},
	function( data, status ) {
		if( data.length > 0 ) {				 
			$("#id-container-rekord").empty();
			$("#id-container-rekord").append("<table id=\"id-table-rekord\" data-classes=\"table table-condensed table-hover\" data-row-style=\"rowStyleNowrap\" data-toggle=\"id-table-rekord\" data-search=\"false\" data-striped=\"false\"></table>");
			$("#id-table-rekord").bootstrapTable({
				columns: [{
					field: "0",
					title: "Rekord",
					align: "left",
					class: "info",
					cellStyle: "cellStyleDefault",
					formatter: "cellFormaterPaddingLeft"
					
				}, {
					field: "1",
					title: "Name",
					align: "left",
					class: "info",
					cellStyle: "cellStyleDefault",
					formatter: "cellFormaterPaddingLeft"
				}, {
					field: "2",
					title: "Ergebnis",
					align: "center",
					class: "info",
					cellStyle: "cellStyleDefault"
				}, {
					field: "3",
					title: "Datum",
					align: "center",
					class: "info",
					cellStyle: "cellStyleDefault"
				}, {
					field: "4",
					title: "Spielort",
					align: "left",
					class: "info less720px",
					cellStyle: "cellStyleDefaultLess720px",
					formatter: "cellFormaterPaddingLeft"
				}]
			});
			$("#id-table-rekord").bootstrapTable("load", data);
			$("#id-table-rekord").css({"border-bottom": "0px"});
			setColor();
		}
	}, "json");
}
function setColor() {
	if( !!Settings.Options.Klub.Name && Settings.Options.Klub.Farbe ) {
		$("td:contains('"+Settings.Options.Klub.Name+"')").addClass("bg-success");
	}
}
function setSpielRow( $row, data ) {
	$row.children().each( function() {		
		switch ($(this).index()) {
		case 2:
			$(this).html(data[4]);
			break;
		case 4:
			$(this).html(data[5]);
			break;
		case 6:
			if( data[8] > 0 || data[8] != ($(this).attr("live") ? $(this).attr("live") : 0)) {
				$(this).fadeOut(1).html(cellFormaterES(data[7], data)).fadeIn(1000);

				// DetailView aktualisieren
				//
				var $Detail = $("[detail-view-index="+$(this).parent().attr("data-index")+"]")
				if( $Detail.length > 0 ) {
					detailFormatter($(this).parent().attr("data-index"), data, $Detail);
				}
			} else {
				$(this).html(cellFormaterES(data[7], data));
			}
			$(this).attr("live", data[8]);
			break;
		}
	});
}
function startTicker( id_saison, id_klub, id_bezirk, id_liga, id_spieltag, favorit, art_bezirk, art_liga, art_spieltag ) {
	$("[data-toggle=\"tooltip\"], [title]:not([data-toggle=\"popover\"])").tooltip("destroy");
	$.post("/php/skvb/service.php", { 
		command: "GetSpiel",
		id_saison: id_saison,
		id_klub: id_klub,
		id_bezirk: id_bezirk,
		id_liga: id_liga || 0,
		id_spieltag: id_spieltag || 0,
		favorit: favorit,
		art_bezirk: art_bezirk,
		art_liga: art_liga,
		art_spieltag: art_spieltag
	},
	function( data, status ) {
		for( var i in data ) {
			$("[data-uniqueid="+data[i][0]+"]").each( function() {
				setSpielRow($(this), data[i]);
			});
		}
	}, "json");
}
function rowStyleNowrap(row, index) {
	return {
		classes: "text-nowrap"
	};
}
function cellStyleInfo(value, row, index, field) {
	return {
		classes: "info",
		css: {"vertical-align": "middle"}
	};
}
function cellStyleActive(value, row, index, field) {
	return {
		classes: "active",
		css: {"vertical-align": "middle"}
	};
}
function cellStyleActiveLess720px(value, row, index, field) {
	return {
		classes: "active less720px",
		css: {"vertical-align": "middle"}
	};
}
function cellStyleDefault(value, row, index, field) {
	return {
		classes: "default",
		css: {"vertical-align": "middle"}
	};
}
function cellStyleDefaultLess720px(value, row, index, field) {
	return {
		classes: "default less720px",
		css: {"vertical-align": "middle"}
	};
}
function cellStyleMP(value, row, index, field) {
	return {
		css: {"color": "black", "font-weight": "bold", "vertical-align": "middle"}
	};
}
function cellStyleMPInfo(value, row, index, field) {
	if( value == "1" ) {
		return {
			classes: "active",
			css: {"vertical-align": "middle"}
		};
	} else {
		return {
			classes: "default",
			css: {"vertical-align": "middle"}
		};
	}
}
function cellStyleHolzGG(value, row, index, field) {
	var l_Color = "black";
	var l_FontWeight = "normal";
	if(row[4] > row[5]) {
		l_Color = "SteelBlue";
		l_FontWeight = "bold";
	}
	return {
		css: {"color": l_Color, "font-weight": l_FontWeight, "vertical-align": "middle"}
	};
}
function cellStyleHolzG(value, row, index, field) {
	var l_Color = "black";
	var l_FontWeight = "normal";
	if(row[4] < row[5]) {
		l_Color = "SteelBlue";
		l_FontWeight = "bold";
	}
	return {
		css: {"color": l_Color, "font-weight": l_FontWeight, "vertical-align": "middle"}
	};
}
function detailFormatter(index, row, $detail) {
	var table = "id-table-info-"+index;
	$.post("/php/skvb/service.php", { 
		command: "GetSpielerInfo",
		id_saison: Settings.Saison.Id,
		id_spiel: $("#id-table-spiel").bootstrapTable("getData")[index][0],
		wertung: $("#id-table-spiel").bootstrapTable("getData")[index][11]
	},
	function( data, status ) {	
		$detail.append("<div class=\"container-fluid container-fluid-custom\"><table id=\""+table+"\" data-classes=\"table table-condensed table-hover\" data-row-style=\"rowStyleNowrap\" data-toggle=\"id-table-info\" data-show-header=\"true\" data-undefined-text=\"\"></table></div>");
		
		if( $("#id-table-spiel").bootstrapTable("getData")[index][11] == Globals.Art.Punkte) {
			$("#"+table).bootstrapTable({
				columns: [{
					field: "0",
					title: "",
					align: "right",
					width: "50%",
					class: "info",
					cellStyle: "cellStyleDefault",
					formatter: "cellFormaterPaddingRight"
				}, {
					field: "1",
					title: "1",
					align: "center",
					class: "info less720px satz-width",
					cellStyle: "cellStyleDefaultLess720px",
					formatter: cellFormaterSatzKegel
					
				}, {
					field: "2",
					title: "2",
					align: "center",
					class: "info less720px satz-width",
					cellStyle: "cellStyleDefaultLess720px",
					formatter: cellFormaterSatzKegel
				}, {
					field: "3",
					title: "3",
					align: "center",
					class: "info less720px satz-width",
					cellStyle: "cellStyleDefaultLess720px",
					formatter: cellFormaterSatzKegel
				}, {
					field: "4",
					title: "4",
					align: "center",
					class: "info less720px satz-width",
					cellStyle: "cellStyleDefaultLess720px",
					formatter: cellFormaterSatzKegel
				}, {
					field: "5",
					title: "Kegel",
					align: "center",
					class: "info kegel-width",
					cellStyle: "cellStyleDefault"
				}, {
					field: "6",
					title: "SP",
					align: "center",
					class: "info sp-width",
					cellStyle: "cellStyleDefault"
				}, {
					field: "7",
					title: "MP",
					align: "center",
					class: "info mp-width",
					cellStyle: "cellStyleMPInfo"
				}, {
					field: "99",
					align: "center",
					width: "5",
					cellStyle: "cellStyleDefault"
				}, {
					field: "8",
					title: "MP",
					align: "center",
					class: "info mp-width",
					cellStyle: "cellStyleMPInfo"
				}, {
					field: "9",
					title: "SP",
					align: "center",
					class: "info sp-width",
					cellStyle: "cellStyleDefault"
				}, {
					field: "10",
					title: "Kegel",
					align: "center",
					class: "info kegel-width",
					cellStyle: "cellStyleDefault"
				}, {
					field: "11",
					title: "4",
					align: "center",
					class: "info less720px  satz-width",
					cellStyle: "cellStyleDefaultLess720px",
					formatter: cellFormaterSatzKegel
				}, {
					field: "12",
					title: "3",
					align: "center",
					class: "info less720px satz-width",
					cellStyle: "cellStyleDefaultLess720px",
					formatter: cellFormaterSatzKegel
				}, {
					field: "13",
					title: "2",
					align: "center",
					class: "info less720px satz-width",
					cellStyle: "cellStyleDefaultLess720px",
					formatter: cellFormaterSatzKegel
				}, {
					field: "14",
					title: "1",
					align: "center",
					class: "info less720px satz-width",
					cellStyle: "cellStyleDefaultLess720px",
					formatter: cellFormaterSatzKegel
				}, {
					field: "15",
					title: "",
					align: "left",
					width: "50%",
					class: "info",
					cellStyle: "cellStyleDefault",
					formatter: "cellFormaterPaddingLeft"
				}]
			});
			$detail.attr("detail-view-index", index);
			$("#"+table).bootstrapTable("load", data);
			var Length = $("#"+table).bootstrapTable("getData").length;
			if(!!row[10]) {
				$("#"+table).bootstrapTable("insertRow", {
					index: Length, 
					row: {0: "<div class=\"text-success print-padding-left\" style=\"white-space: break-spaces\">"+row[10]+"</div>"}
				});
				$("#"+table).bootstrapTable("mergeCells", {
					index: Length, 
					field: "0", colspan: 17, rowspan: 0});
				$("#"+table).find("[colspan=\"17\"]").each( function() {
					$(this).css({"text-align": "left"});
				});
			}
			for( var i=0; i<4; i++) {
				$("#"+table).find("tr").eq(Length).find("td").eq(i+1).css({"border-left": "0px"});
				$("#"+table).find("tr").eq(Length).find("td").eq(i+13).css({"border-left": "0px"});
			}
			$("#"+table).find("tr").eq(Length).find("td").eq(11).css({"border-right": "1px solid #ddd"});
			$("#"+table).css({"border-bottom": "0px", "table-layout": "fixed"});
			$("#"+table+" td").css({"overflow": "hidden", "text-overflow": "ellipsis"});
			$(".detail-view > td").css({"padding": "0px"});
			$("[data-field=\"99\"]").css({"padding-left": "5px"});
			$("[data-field=\"99\"]").css({"padding-right": "5px"});
			$(".detail-view").find(".fixed-table-container").each( function() {
				$(this).css({"border": "0px"});
			});
		} else {
			$("#"+table).bootstrapTable({
				columns: [{
					field: "0",
					title: "",
					align: "center",
					width: "20",
					class: "info",
					cellStyle: "cellStyleDefault"
				}, {
					field: "1",
					title: "",
					align: "right",
					width: "50%",
					class: "info",
					cellStyle: "cellStyleDefault",
					formatter: "cellFormaterPaddingRight"
				}, {
					field: "2",
					title: "V",
					align: "center",
					class: "info volle-width",
					cellStyle: "cellStyleDefault"
				}, {
					field: "3",
					title: "A",
					align: "center",
					class: "info abr-width",
					cellStyle: "cellStyleDefault"
				}, {
					field: "4",
					title: "F",
					align: "center",
					class: "info fehler-width less720px",
					cellStyle: "cellStyleDefaultLess720px"
				}, {
					field: "5",
					title: "Kegel",
					align: "center",
					class: "info kegel-width",
					cellStyle: "cellStyleDefault"
				}, {
					field: "99",
					align: "center",
					width: "5",
					cellStyle: "cellStyleDefault"
				}, {
					field: "6",
					title: "Kegel",
					align: "center",
					class: "info kegel-width",
					cellStyle: "cellStyleDefault"
				}, {
					field: "7",
					title: "F",
					align: "center",
					class: "info fehler-width less720px",
					cellStyle: "cellStyleDefaultLess720px"
				}, {
					field: "8",
					title: "A",
					align: "center",
					class: "info abr-width",
					cellStyle: "cellStyleDefault"
				}, {
					field: "9",
					title: "V",
					align: "center",
					class: "info volle-width",
					cellStyle: "cellStyleDefault"
				}, {
					field: "10",
					title: "",
					align: "left",
					width: "50%",
					class: "info",
					cellStyle: "cellStyleDefault",
					formatter: "cellFormaterPaddingLeft"
				}, {
					field: "11",
					title: "",
					align: "left",
					width: "20",
					class: "info",
					cellStyle: "cellStyleDefault"
				}]
			});
			$detail.attr("detail-view-index", index);
			$("#"+table).bootstrapTable("load", data);
			var Length = $("#"+table).bootstrapTable("getData").length;
			if(!!row[10]) {
				$("#"+table).bootstrapTable("insertRow", {
					index: Length, 
					row: {0: "<div class=\"text-success print-padding-left\" style=\"white-space: break-spaces\">"+row[10]+"</div>"}
				});
				$("#"+table).bootstrapTable("mergeCells", {
					index: Length, 
					field: "0", colspan: 13, rowspan: 0});
				$("#"+table).find("[colspan=\"13\"]").each( function() {
					$(this).css({"text-align": "left"});
				});
			}
			$("#"+table).css({"border-bottom": "0px", "table-layout": "fixed"});
			$("#"+table+" td").css({"overflow": "hidden", "text-overflow": "ellipsis"});
			$(".detail-view > td").css({"padding": "0px"});
			$("[data-field=\"99\"]").css({"padding-left": "5px"});
			$("[data-field=\"99\"]").css({"padding-right": "5px"});
			$(".detail-view").find(".fixed-table-container").each( function() {
				$(this).css({"border": "0px"});
			});
		}
	}, "json");
}
function cellFormaterPaddingLeft(value, row) {
	return "<div class=\"print-padding-left\">"+value+"</div>";
}
function cellFormaterPaddingRight(value, row) {
	return "<div class=\"print-padding-right\">"+value+"</div>";
}
function cellFormaterMannschaft(value, row) {
	return "<div class=\"pull-left print-padding-left\">"+row[2]+"</div><div class=\"pull-right text-muted\" style=\"width: 50px; text-align: center;\">"+row[3]+"</div>";
}
function cellFormaterBahnanlage1(value, row) {
	return "<div class=\"pull-left print-padding-left\">"
			+"<p style=\"line-height: 0.7 padding-top: 5px;\"><strong>"+row[4]+"</strong></p>"
			+"<p style=\"line-height: 0.7;\"><span class=\"text-muted\">Spieltag:&nbsp;</span><span>"+row[1]+"</span></p>"
			+"<p style=\"line-height: 0.7;\"><span class=\"text-muted\">Spielzeit:&nbsp;</span><span>"+row[2]+"</span><span class=\"text-muted\">&nbsp;Uhr</span></p>"
			+"<p style=\"line-height: 0.7;\"><span class=\"text-muted\">Spielt&nbsp;auf&nbsp;Bahn:&nbsp;</span><span>"+row[3]+"</span></p></div>";
}
function cellFormaterBahnanlage2(value, row) {
	var l_Adresse = "";
	var l_TelefonFax = "";
	var l_Mobil = "";
	var l_EMail = "";
	
	//
	
	if(row[7].trim().length > 0) {
		l_Adresse += row[7].trim();
	}
	if(row[5].trim().length > 0) {
		if(l_Adresse.length > 0) {
			l_Adresse += ", ";
		}
		l_Adresse += row[5].trim();
	}
	if(row[6].trim().length > 0) {
		if(l_Adresse.length > 0) {
			l_Adresse += "&nbsp;";
		}
		l_Adresse += row[6].trim();
	}
	
	//
	
	if(row[8].trim().length > 0) {
		l_TelefonFax += "<span class=\"text-muted\">Telefon:&nbsp;</span><span>" + row[8].trim() + "</span>";
	}
	if(row[9].trim().length > 0) {
		if(l_TelefonFax.length > 0) {
			l_TelefonFax += "<span class=\"text-muted\">&nbsp;/&nbsp;Fax:&nbsp;</span>";
		}
		l_TelefonFax += row[9].trim();
	}
	if(row[10].trim().length > 0) {
		l_Mobil += "<span class=\"text-muted\">Mobil:&nbsp;</span><span>" + row[10].trim() + "</span>";
	}
	if(row[11].trim().length > 0) {
		l_EMail += "<span class=\"text-muted\">E-Mail:&nbsp;</span><span>" + row[11].trim() + "</span>";
	}
	
	return "<div class=\"pull-left print-padding-left\">"
			+ (l_Adresse.length > 0 ? ("<p style=\"line-height: 0.7;\">"+l_Adresse+"</p>") : "")
			+ (l_TelefonFax.length > 0 ? ("<p style=\"line-height: 0.7;\">"+l_TelefonFax+"</p>") : "")
			+ (l_Mobil.length > 0 ? ("<p style=\"line-height: 0.7;\">"+l_Mobil+"</p>") : "")
			+ (l_EMail.length > 0 ? ("<p style=\"line-height: 0.7;\">"+l_EMail+"</p>") : "")
			+ "</div>";
}
function cellFormaterMannschaftLess720px(value, row) {
	return "<div class=\"pull-left\">"+row[2]+"</div><div class=\"pull-right text-muted less720px\" style=\"width: 50px; text-align: center;\">"+row[3]+"</div>";
}
function cellFormaterSpieler(value, row) {
	return "<div class=\"pull-left print-padding-left\">"+row[1]+"</div><div class=\"pull-right text-muted less720px\" style=\"width: 80px; text-align: center;\">"+row[3]+"</div>";
}
function cellFormaterSpielGG(value, row) {
	return "<div class=\"pull-left text-muted less720px\">"+row[1]+"</div><div class=\"pull-right print-padding-right\" style=\"cursor: help;\" data-toggle=\"tooltip\" data-placement=\"top\" title=\""+row[12]+"\">"+value+"</div>";
}
function cellFormaterSpielG(value, row) {
	return "<div class=\"pull-left print-padding-left\">"+value+"</div><div class=\"pull-right text-muted less720px\">"+row[2]+"</div>";
}
function cellFormaterTPG(value, row) {
	return "<table width=\"100%\">" +
		   "<tr nowrap>" +
		   "<td width=\"40%\" align=\"right\"  style=\"border: 0px\">"+row[16]+"</td>" +
		   "<td width=\"20%\" align=\"center\" style=\"border: 0px\">-</td>" +
		   "<td width=\"40%\" align=\"left\"   style=\"border: 0px\">"+row[19]+"</td>" +
		   "</tr>" +
		   "</table>";
}
function cellFormaterTPH(value, row) {
	return "<table width=\"100%\">" +
		   "<tr nowrap>" +
		   "<td width=\"40%\" align=\"right\"  style=\"border: 0px\">"+row[17]+"</td>" +
		   "<td width=\"20%\" align=\"center\" style=\"border: 0px\">-</td>" +
		   "<td width=\"40%\" align=\"left\"   style=\"border: 0px\">"+row[20]+"</td>" +
		   "</tr>" +
		   "</table>";
}
function cellFormaterTPA(value, row) {
	return "<table width=\"100%\">" +
		   "<tr nowrap>" +
		   "<td width=\"40%\" align=\"right\"  style=\"border: 0px\">"+row[18]+"</td>" +
		   "<td width=\"20%\" align=\"center\" style=\"border: 0px\">-</td>" +
		   "<td width=\"40%\" align=\"left\"   style=\"border: 0px\">"+row[21]+"</td>" +
		   "</tr>" +
		   "</table>";
}
function cellFormaterTPG120(value, row) {
	return "<table width=\"100%\">" +
		   "<tr nowrap>" +
		   "<td width=\"40%\" align=\"right\"  style=\"border: 0px\">"+row[7]+"</td>" +
		   "<td width=\"20%\" align=\"center\" style=\"border: 0px\">-</td>" +
		   "<td width=\"40%\" align=\"left\"   style=\"border: 0px\">"+row[10]+"</td>" +
		   "</tr>" +
		   "</table>";
}
function cellFormaterTPH120(value, row) {
	return "<table width=\"100%\">" +
		   "<tr nowrap>" +
		   "<td width=\"40%\" align=\"right\"  style=\"border: 0px\">"+row[8]+"</td>" +
		   "<td width=\"20%\" align=\"center\" style=\"border: 0px\">-</td>" +
		   "<td width=\"40%\" align=\"left\"   style=\"border: 0px\">"+row[11]+"</td>" +
		   "</tr>" +
		   "</table>";
}
function cellFormaterTPA120(value, row) {
	return "<table width=\"100%\">" +
		   "<tr nowrap>" +
		   "<td width=\"40%\" align=\"right\"  style=\"border: 0px\">"+row[9]+"</td>" +
		   "<td width=\"20%\" align=\"center\" style=\"border: 0px\">-</td>" +
		   "<td width=\"40%\" align=\"left\"   style=\"border: 0px\">"+row[12]+"</td>" +
		   "</tr>" +
		   "</table>";
}
function cellFormaterTPGDV(value, row) {
	return (row[25] == "" && row[28] == "") ? "" :
		   "<table width=\"100%\">" +
		   "<tr nowrap>" +
		   "<td width=\"40%\" align=\"right\"  style=\"border: 0px\">"+row[25]+"</td>" +
		   "<td width=\"20%\" align=\"center\" style=\"border: 0px\">-</td>" +
		   "<td width=\"40%\" align=\"left\"   style=\"border: 0px\">"+row[28]+"</td>" +
		   "</tr>" +
		   "</table>";
}
function cellFormaterTPHDV(value, row) {
	return (row[26] == "" && row[29] == "") ? "" :
	       "<table width=\"100%\">" +
		   "<tr nowrap>" +
		   "<td width=\"40%\" align=\"right\"  style=\"border: 0px\">"+row[26]+"</td>" +
		   "<td width=\"20%\" align=\"center\" style=\"border: 0px\">-</td>" +
		   "<td width=\"40%\" align=\"left\"   style=\"border: 0px\">"+row[29]+"</td>" +
		   "</tr>" +
		   "</table>";
}
function cellFormaterTPADV(value, row) {
	return (row[27] == "" && row[30] == "") ? "" :
	       "<table width=\"100%\">" +
		   "<tr nowrap>" +
		   "<td width=\"40%\" align=\"right\"  style=\"border: 0px\">"+row[27]+"</td>" +
		   "<td width=\"20%\" align=\"center\" style=\"border: 0px\">-</td>" +
		   "<td width=\"40%\" align=\"left\"   style=\"border: 0px\">"+row[30]+"</td>" +
		   "</tr>" +
		   "</table>";
}
function cellFormaterES(value, row) {
	var livestream = "";
	if(row[13].trim().length > 0) {
		livestream = "<a href=\""+row[13]+"\" target=\"_blank\"><span class=\"glyphicon glyphicon-facetime-video\" style=\"color: limegreen; cursor: help;\" title=\"Livestream\"></span></a>";
	}
	if(value == "0" || value == "2" || value == "3" || value == "4") {	
		if(row[8] > "0") {
			return "<div><span class=\"glyphicon glyphicon-eye-open\" style=\"color: SteelBlue; padding-right: 5px; cursor: help;\" data-toggle=\"tooltip\" data-placement=\"top\" title=\""+row[9]+"\"></span>"+livestream+"</div>";
		} else {
			if(value == "0") {
				return "<div><span class=\"glyphicon glyphicon-pencil text-muted\" style=\"padding-right: 5px; cursor: help;\" data-toggle=\"tooltip\" data-placement=\"top\" title=\""+row[9]+"\"></span>"+livestream+"</div>";
			} else {
				return "<div><span class=\"glyphicon glyphicon-question-sign\" style=\"color: Coral; padding-right: 5px; cursor: help;\" data-toggle=\"tooltip\" data-placement=\"top\" title=\""+row[9]+"\"></span>"+livestream+"</div>";
			}
		}
	} else if(value == "8") {
		return "<div><span class=\"glyphicon glyphicon-flag\" style=\"color: SteelBlue; padding-right: 5px; cursor: help;\" data-toggle=\"tooltip\" data-placement=\"top\" title=\""+row[9]+"\"></span>"+livestream+"</div>";
	} else {
		return "<div><span class=\"glyphicon glyphicon-ok\" style=\"color: green; padding-right: 5px; cursor: help;\" data-toggle=\"tooltip\" data-placement=\"top\" title=\""+row[9]+"\"></span>"+livestream+"</div>";
	}
}
function cellFormaterSatzKegel(value, row) {
	return "<div class=\"text-muted\" style=\"font-size: 12px;\">"+value+"</div>";
}
function cellFormaterFavorit(value, row) {
	var Index = -1;
	for( var i = 0; i < Settings.Favorit.length; i++) {
		if( Settings.Favorit[i].Saison == Settings.Saison.Id && Settings.Favorit[i].Liga == row[0] ) {
			Index = i;
			break;
		}
	}
	if(Index >= 0) {
		return "<button id=\""+row[0]+"\" type=\"button\" class=\"btn btn-link button-favorit\" style=\"color: GoldenRod; border: 0px; padding-top: 0px; padding-bottom: 0px; padding-left: 4px; padding-right: 4px;\"><i class=\"glyphicon glyphicon-star\"></i></button>";
	} else {
		return "<button id=\""+row[0]+"\" type=\"button\" class=\"btn btn-link button-favorit\" style=\"color: SteelBlue; border: 0px; padding-top: 0px; padding-bottom: 0px; padding-left: 4px; padding-right: 4px;\"><i class=\"glyphicon glyphicon-star-empty\"></i></button>";
	}
}
function resizeView() {
	setInterval( function() { 
		$(".main").fadeIn(300).css("top", ($(".nav").outerHeight()+20)+"px");
	}, 300);
}
function isNumber(evt) {
    evt = (evt) ? evt : window.event;
    var charCode = (evt.which) ? evt.which : evt.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
        return false;
    }
    return true;
}
function getMonday( Value ) {
    var Day = Value.getDay() || 7;  
    if( Day > 1 ) {
        Value.setDate(Value.getDate() - (Day-1));
	}
    return Value;
}
function getSunday( Value ) {
    var Day = Value.getDay();  
    if( Day > 0 ) {
        Value.setDate(Value.getDate() + (7-Day));
	}
    return Value;
}
function formatDate( Value ) {
    return Value.toLocaleDateString("de-DE", {year: "numeric", month: "2-digit", day: "2-digit"});
}
function setContainer(Container) {
	clearInterval(Globals.Ticker.Id);
	$(".main").empty().hide();
	var isMobile = {
		Android: function() {
			return navigator.userAgent.match(/Android/i);
		},
		BlackBerry: function() {
			return navigator.userAgent.match(/BlackBerry/i);
		},
		iOS: function() {
			return navigator.userAgent.match(/iPhone|iPad|iPod/i);
		},
		Opera: function() {
			return navigator.userAgent.match(/Opera Mini/i);
		},
		Windows: function() {
			return navigator.userAgent.match(/IEMobile/i);
		},
		any: function() {
			return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
		}
	};

	$(".main").append(getListenkopf());
	$(".main").append(getUeberschrift());
	for( var i = 0; i < Container.length; i++ ) {
		if(isMobile.any()) {
			$(".main").fadeOut(1).append("<div class=\"container-fluid\" style=\"margin-bottom: 10px; padding-left: 5px; padding-right: 5px;\" id=\"" +Container[i]+"\"></div>");
		} else {
			if( Container[i] == "id-container-schnitt") {
				$(".main").append(getListenkopf("page-break"));
			}
			$(".main").fadeOut(1).append("<div class=\"container\" style=\"margin-bottom: 10px; padding-left: 5px; padding-right: 5px;\" id=\"" +Container[i]+"\"></div>");
		}
	}
	$(".main").append("<div class=\"container-fluid\" style=\"height: 20px;\"></div>");
	resizeView();
}
function getListenkopf(Class) {
	if( Settings.Liga.Art == Globals.Art.Liga || Settings.Liga.Art == Globals.Art.Pokal) {
		return "<div class=\"container visible-print "+Class+"\" id=\"id-container-kopf\"><div class=\"media\"><div style=\"float: left; padding-bottom: 10px; padding-right: 10px;\"><img src=\"png/skvb_logo_sm.png\" width=\"65\" height=\"65\"></div><div class=\"media-body\" style=\"display:table-cell; vertical-align:middle; text-align: center;\"><h3 class=\"media-heading\">Sportkegler- und Bowlingverband Brandenburg e. V.</h3></div><div style=\"text-align: center;\"><h6 style=\"margin-top: 0px; margin-bottom: 5px;\"><strong>Spielleiter</strong>: "+$("[index-menuitem-liga=\""+Settings.Liga.Index+"\"]").attr("spielleiter-menuitem-liga")+"; <strong>Tel.</strong>: "+$("[index-menuitem-liga=\""+Settings.Liga.Index+"\"]").attr("telefon-menuitem-liga")+"; <strong>Mobil</strong>: "+$("[index-menuitem-liga=\""+Settings.Liga.Index+"\"]").attr("mobil-menuitem-liga")+";</h6></div><div style=\"text-align: center;\"><h6 style=\"margin-top: 0px; margin-bottom: 5px;\"><strong>E-Mail</strong>: "+$("[index-menuitem-liga=\""+Settings.Liga.Index+"\"]").attr("email-menuitem-liga")+"; <strong>Fax.</strong>: "+$("[index-menuitem-liga=\""+Settings.Liga.Index+"\"]").attr("fax-menuitem-liga")+"</h6></div></div></div>";
	} else {
		return "<div class=\"container visible-print "+Class+"\" id=\"id-container-kopf\"><div class=\"media\"><div style=\"float: left; padding-bottom: 10px; padding-right: 10px;\"><img src=\"png/skvb_logo_sm.png\" width=\"65\" height=\"65\"></div><div class=\"media-body\" style=\"vertical-align:middle; text-align: center;\"><h3 class=\"media-heading\">Sportkegler- und Bowlingverband Brandenburg e. V.</h3></div></div></div>";
	}
}
function getUeberschrift() {
	var Saison = $("#id-dropdown-saison").text().trim().substring(2,4);
	Saison = $("#id-dropdown-saison").text().trim() + "-" + (++Saison);
	if( Settings.Liga.Art == Globals.Art.Liga || Settings.Liga.Art == Globals.Art.Pokal) {
		return "<div class=\"container visible-print\" id=\"id-container-ueberschrift\"><h6 style=\"margin-top: 0px; margin-bottom: 0px;\"><strong>"
		+ "Saison " + Saison + " / " 
		+ $("#id-dropdown-bezirk").text().trim() + " / " 
		+ $("#id-dropdown-liga").text().trim()  + " / " 
		+ (Settings.Spieltag.Art == Globals.Art.Spieltag ? $("#id-dropdown-spieltag").text().trim() : "aktuelle Spielwoche")
		+ "</strong></h6></div>";
	} else {
		return "<div class=\"container visible-print\" id=\"id-container-ueberschrift\"><h6 style=\"margin-top: 0px; margin-bottom: 0px;\"><strong>"
		+ "Saison " + Saison + " / " 
		+ $("#id-dropdown-bezirk").text().trim() + " / " 
		+ $("#id-dropdown-liga").text().trim() + ($("#id-dropdown-spieltag").is(':visible') ? " / " + $("#id-dropdown-spieltag").text().trim() : "")
		+ "</strong></h6></div>";
	}
}
function getParameter(Name){
    var results = new RegExp('[\?&]' + Name + '=([^&#]*)').exec(window.location.href);
    return (!!results ? (decodeURI(results[1]) || "0") : null);
}
window.onload = function(e) {
	Settings = JSON.parse(localStorage.getItem("Sportwinner.Settings")) || Settings;

	var Bezirk = getParameter("bezirk");
	var Exp = new RegExp("[0-8]");
	if( Bezirk && !isNaN(Bezirk) && Bezirk.length == 1 && Exp.test(Bezirk) ) {
		Settings.Bezirk.Id = Bezirk;
		if( Bezirk == "0") {
			Settings.Bezirk.Art = Globals.Art.Land;
			Settings.Bezirk.Index = Settings.Bezirk.DefaultIndex;
			initSettings(Globals.Objekt.Bezirk);
		} else {
			Settings.Bezirk.Art = Globals.Art.Bezirk;
			Settings.Bezirk.Index = null;
			initSettings(Globals.Objekt.Bezirk);						   
		}
	} else {
		var Klub = getParameter("klub");
		if( Klub ) {
			Settings.Bezirk.id = null;
			initSettings(Globals.Objekt.Bezirk);
			Settings.Bezirk.Art =  (Globals.Art.Klub + Globals.Art.Favorit);
			Settings.Options.Klub.Nummer = Klub;
		}
	}
	
	loadSaison();
	loadMain();
	resizeView();
	
	// Ereignisse registrieren
	//
	$( window ).resize(function() {
		resizeView();
	});
	$("#impressum").on("click", function(e) {
		loadImpressum();
	});
	$("#datenschutz").on("click", function(e) {
		loadDatenschutz();
	});
	$(".dropdown").on("click", "#id-dropdown-saison", function(e) {
		$(".menuitem-saison").removeClass('bg-info');
		$("[index-menuitem-saison=\""+$(this).attr("index-dropdown-saison")+"\"]").addClass('bg-info');
	});
	$(".dropdown").on("click", "#id-dropdown-bezirk", function(e) {
		$(".menuitem-bezirk").removeClass('bg-info');		
		$("[index-menuitem-bezirk=\""+$(this).attr("index-dropdown-bezirk")+"\"]").addClass('bg-info');
	});
	$(".dropdown").on("click", "#id-dropdown-liga", function(e) {
		$(".menuitem-liga").removeClass('bg-info');
		$("[index-menuitem-liga=\""+$(this).attr("index-dropdown-liga")+"\"]").addClass('bg-info');
	});	
	$(".dropdown").on("click", "#id-dropdown-spieltag", function(e) {
		$(".menuitem-spieltag").removeClass('bg-info');
		$("[index-menuitem-spieltag=\""+$(this).attr("index-dropdown-spieltag")+"\"]").addClass('bg-info');
	});
	$(".dropdown").on("click", "#id-dropdown-bezirk-favorit", function(e) {
		$(".menuitem-bezirk-favorit").removeClass('bg-info');		
		$("[index-menuitem-bezirk-favorit=\""+$(this).attr("index-dropdown-bezirk-favorit")+"\"]").addClass('bg-info');
	});
	$(".dropdown-menu").on("click", ".menuitem-saison", function(e) {
		if(Settings.Saison.Id != $(this).attr("id-menuitem-saison")) {
			Settings.Bezirk.DefaultIndex = null;
		}
		Settings.Saison.Id = $(this).attr("id-menuitem-saison");
		Settings.Saison.Index = $(this).attr("index-menuitem-saison");
		initSettings(Globals.Objekt.Saison);
		initSaison();
	});
	$(".dropdown-menu").on("click", ".menuitem-bezirk", function(e) {
		Settings.Bezirk.Id = $(this).attr("id-menuitem-bezirk");
		Settings.Bezirk.Art = $(this).attr("art-menuitem-bezirk");
		Settings.Bezirk.Index = $(this).attr("index-menuitem-bezirk");
		initSettings(Globals.Objekt.Bezirk);
		initBezirk();
	});
	$(".dropdown-menu").on("click", ".menuitem-liga", function(e) {
		Settings.Liga.Id = $(this).attr("id-menuitem-liga");
		Settings.Liga.Wertung = $(this).attr("wertung-menuitem-liga");
		Settings.Liga.Art = $(this).attr("art-menuitem-liga");
		Settings.Liga.Index = $(this).attr("index-menuitem-liga");
		initSettings(Globals.Objekt.Liga);
		initLiga();
	
		if( Settings.Liga.Art == Globals.Art.Pokal) {
			var Container = ["id-container-ergebnisse", "id-container-spieltagbester", "id-container-rekord"];
			setContainer(Container);
			loadSpiel();
			loadSpieltagBester();
			loadRekord();
		} else if( Settings.Liga.Art == Globals.Art.Liga) {
			var Container = ["id-container-ergebnisse", "id-container-tabelle", "id-container-spieltagbester", "id-container-rekord", "id-container-schnitt"];
			setContainer(Container);
			loadSpiel();
			loadTabelle();
			loadSpieltagBester();
			loadRekord();
			loadSchnitt();
		} else if( Settings.Liga.Art == Globals.Art.Schnitt ) {
			var Container = ["id-container-schnitt"];
			setContainer(Container);
			loadSchnitt();
		} else {
			var Container = ["id-container-ergebnisse"];
			setContainer(Container);
			loadSpiel();
		}
    });
	$(".dropdown-menu").on("click", ".menuitem-spieltag", function(e) {
		Settings.Spieltag.Id = $(this).attr("id-menuitem-spieltag");
		Settings.Spieltag.Art = $(this).attr("art-menuitem-spieltag");
		Settings.Spieltag.Nummer = $(this).attr("nr-menuitem-spieltag");
		Settings.Spieltag.Index = $(this).attr("index-menuitem-spieltag");
		initSettings(Globals.Objekt.Spieltag);
		initSpieltag();

		if( Settings.Spieltag.Art == Globals.Art.Spieltag) {
			if( Settings.Liga.Art == Globals.Art.Pokal) {
				var Container = ["id-container-ergebnisse", "id-container-spieltagbester", "id-container-rekord"];
				setContainer(Container);
				loadSpiel();
				loadSpieltagBester();
				loadRekord();
			} else {
				var Container = ["id-container-ergebnisse", "id-container-tabelle", "id-container-spieltagbester", "id-container-rekord", "id-container-schnitt"];
				setContainer(Container);
				loadSpiel();
				loadTabelle();
				loadSpieltagBester();
				loadRekord();
				loadSchnitt();
			}
		} else if( Settings.Spieltag.Art == Globals.Art.Spielplan) {
			var Container = ["id-container-spielplan"];
			setContainer(Container);
			loadSpielplan();
		} else {
			var Container = ["id-container-bahnanlage"];
			setContainer(Container);
			loadBahnanlage();
		}
    });
	$(".dropdown-menu").on("click", ".menuitem-bezirk-favorit", function(e) {
		initBezirkFavorit($(this).attr("id-menuitem-bezirk-favorit"),$(this).attr("art-menuitem-bezirk-favorit"), $(this).attr("index-menuitem-bezirk-favorit"));
	});
	$(".navbar").on("click", "#id-button-home", function(e) {
		location.reload();
	});
	$(".navbar").on("click", "#id-button-einstellungen", function(e) {
		$("#id-klub-nr").val(Settings.Options.Klub.Nummer);
		$("#id-klub-name").val(Settings.Options.Klub.Name);
		$("#id-klub-color").prop("checked", Settings.Options.Klub.Farbe);
		$("#nav-tab-favorit").removeClass("active");
		$("#id-pane-favorit").removeClass("active in");
		$("#nav-tab-klub").addClass("active");
		$("#id-pane-klub").addClass("active in");
		
		loadBezirkFavorit();
		$("#id-modal-einstellungen").modal({backdrop: "static"}).css({top: "150px"});
		$(".nav-tabs a[href=\"#id-pane-klub\"]").tab("show");
	});
	$(".modal").on("click", "#id-button-einstellungen-option-ok", function(e) {
		initSettings(Globals.Objekt.Bezirk);
		Settings.Options.Klub.Nummer = $("#id-klub-nr").val().trim();
		Settings.Options.Klub.Name = $("#id-klub-name").val().trim();
		Settings.Options.Klub.Farbe = $("#id-klub-color").is(":checked");
		Settings.Bezirk.Art = Globals.Art.Klub + Globals.Art.Favorit;
		loadKlub();
	});
	$(".main").on("click", "#id-button-tabelle-gesamt:not(\".disabled\")", function(e) {
		Settings.Options.Tabelle.Sort = "id-tabelle-sort-gesamt";
		localStorage.setItem("Sportwinner.Settings", JSON.stringify(Settings));
		loadTabelle();
	});
	$(".main").on("click", "#id-button-tabelle-heim:not(\".disabled\")", function(e) {
		Settings.Options.Tabelle.Sort = "id-tabelle-sort-heim";
		localStorage.setItem("Sportwinner.Settings", JSON.stringify(Settings));
		loadTabelle();
	});
	$(".main").on("click", "#id-button-tabelle-ausw:not(\".disabled\")", function(e) {
		Settings.Options.Tabelle.Sort = "id-tabelle-sort-ausw";
		localStorage.setItem("Sportwinner.Settings", JSON.stringify(Settings));
		loadTabelle();
	});
	$(".main").on("click", "#id-button-schnitt-gesamt:not(\".disabled\")", function(e) {
		Settings.Options.Schnitt.Sort = "id-schnitt-sort-gesamt";
		localStorage.setItem("Sportwinner.Settings", JSON.stringify(Settings));
		loadSchnitt();
	});
	$(".main").on("click", "#id-button-schnitt-heim:not(\".disabled\")", function(e) {
		Settings.Options.Schnitt.Sort = "id-schnitt-sort-heim";
		localStorage.setItem("Sportwinner.Settings", JSON.stringify(Settings));
		loadSchnitt();
	});
	$(".main").on("click", "#id-button-schnitt-ausw:not(\".disabled\")", function(e) {
		Settings.Options.Schnitt.Sort = "id-schnitt-sort-ausw";
		localStorage.setItem("Sportwinner.Settings", JSON.stringify(Settings));
		loadSchnitt();
	});
	$(".main").on("click", "#id-button-spieltagbester-gesamt:not(\".disabled\")", function(e) {
		Settings.Options.Spieltagbester.Sort = "id-spieltagbester-sort-gesamt";
		localStorage.setItem("Sportwinner.Settings", JSON.stringify(Settings));
		loadSpieltagBester();
	});
	$(".main").on("click", "#id-button-spieltagbester-heim:not(\".disabled\")", function(e) {
		Settings.Options.Spieltagbester.Sort = "id-spieltagbester-sort-heim";
		localStorage.setItem("Sportwinner.Settings", JSON.stringify(Settings));
		loadSpieltagBester();
	});
	$(".main").on("click", "#id-button-spieltagbester-ausw:not(\".disabled\")", function(e) {
		Settings.Options.Spieltagbester.Sort = "id-spieltagbester-sort-ausw";
		localStorage.setItem("Sportwinner.Settings", JSON.stringify(Settings));
		loadSpieltagBester();
	});
	$(".main").on("click", "#id-button-tabelle-option:not(\".disabled\")", function(e) {
		var id_tabelle_art = Settings.Options.Tabelle.Art;
		var id_tabelle_sort = Settings.Options.Tabelle.Sort;
		
		if(!id_tabelle_art) {
			$("#id-tabelle-art-erweitert").prop("checked", true);
		} else {
			$("#"+id_tabelle_art+"").prop("checked", true);
		}
		if(!id_tabelle_sort) {
			$("#id-tabelle-sort-gesamt").prop("checked", true);
		} else {
			$("#"+id_tabelle_sort+"").prop("checked", true);
		}
		$("#id-modal-tabelle").modal({backdrop: "static"}).css({top: "150px"});
	});
	$(".modal").on("click", "#id-button-tabelle-option-ok", function(e) {
		Settings.Options.Tabelle.Art = $("#id-tabelle-well-1 input:radio:checked").attr("id");
		Settings.Options.Tabelle.Sort = $("#id-tabelle-well-2 input:radio:checked").attr("id");
		localStorage.setItem("Sportwinner.Settings", JSON.stringify(Settings));
		loadTabelle();
	});
	$(".main").on("click", "#id-button-schnitt-option:not(\".disabled\")", function(e) {
		var id_schnitt_art = Settings.Options.Schnitt.Art;
		var id_schnitt_sort = Settings.Options.Schnitt.Sort;
		
		if(!id_schnitt_art) {
			$("#id-schnitt-art-erweitert").prop("checked", true);
		} else {
			$("#"+id_schnitt_art+"").prop("checked", true);
		}
		if(!id_schnitt_sort) {
			$("#id-schnitt-sort-gesamt").prop("checked", true);
		} else {
			$("#"+id_schnitt_sort+"").prop("checked", true);
		}
		$("#id-schnitt-anzahl").val(Settings.Options.Schnitt.Anzahl);
		$("#id-modal-schnitt").modal({backdrop: "static"}).css({top: "150px"});
	});
	$(".modal").on("click", "#id-button-schnitt-option-ok", function(e) {
		Settings.Options.Schnitt.Art = $("#id-schnitt-well-1 input:radio:checked").attr("id");
		Settings.Options.Schnitt.Sort = $("#id-schnitt-well-2 input:radio:checked").attr("id");
		Settings.Options.Schnitt.Anzahl = $("#id-schnitt-anzahl").val();
		localStorage.setItem("Sportwinner.Settings", JSON.stringify(Settings));
		loadSchnitt();
	});
	$(".main").on("click", "#id-button-spieltagbester-option:not(\".disabled\")", function(e) {
		var id_spieltagbester_sort = Settings.Options.Spieltagbester.Sort;
		
		if(!id_spieltagbester_sort) {
			$("#id-spieltagbester-sort-ausw").prop("checked", true);
		} else {
			$("#"+id_spieltagbester_sort+"").prop("checked", true);
		}
		$("#id-spieltagbester-anzahl").val(Settings.Options.Spieltagbester.Anzahl);
		$("#id-modal-spieltagbester").modal({backdrop: "static"}).css({top: "150px"});
	});
	$(".modal").on("click", "#id-button-spieltagbester-option-ok", function(e) {
		Settings.Options.Spieltagbester.Sort = $("#id-spieltagbester-well-1 input:radio:checked").attr("id");
		Settings.Options.Spieltagbester.Anzahl = $("#id-spieltagbester-anzahl").val();
		localStorage.setItem("Sportwinner.Settings", JSON.stringify(Settings));
		loadSpieltagBester();
	});
	$(".modal").on("click", ".button-favorit", function(e) {
		var Liga = $(this).attr("id");
		var Index = -1;
		for( var i = 0; i < Settings.Favorit.length; i++) {
			if( Settings.Favorit[i].Saison == Settings.Saison.Id && Settings.Favorit[i].Liga == Liga ) {
				Index = i;
				break;
			}
		}
		if(Index >= 0) {
			Settings.Favorit.splice(Index,1);
			$(this).children("i.glyphicon").removeClass("glyphicon-star");
			$(this).children("i.glyphicon").addClass("glyphicon-star-empty");
			$(this).css({color: "SteelBlue"});
		} else {
			if(Settings.Favorit.length<10) {
				Settings.Favorit.push({Saison: Settings.Saison.Id, Liga: Liga});
				$(this).children("i.glyphicon").removeClass("glyphicon-star-empty");
				$(this).children("i.glyphicon").addClass("glyphicon-star");
				$(this).css({color: "GoldenRod"});
			} else {
				alert(Globals.Fehler[1]);
			}
		}
	});
	$(".nav-tabs li#nav-tab-favorit").on("shown.bs.tab", function(event) {
		loadLigaFavorit();
	});
}