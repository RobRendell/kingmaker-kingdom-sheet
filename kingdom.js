
// ====================== Changes to global objects ======================

var Class = {
    create: function(settings) {
	var newClass = function() {
	    this.init.apply(this, arguments);
	}
	newClass.prototype.init = function() {};
	$.extend(newClass.prototype, settings);
	return newClass;
    }
};

String.prototype.capitalise = function()
{
    return this.charAt(0).toUpperCase() + this.substring(1);
};

String.prototype.toId = function()
{
    return this.replace(/[^a-zA-Z0-9]/g, '_');
}

Number.prototype.plus = function()
{
    if (this >= 0)
	return "+" + this.toString();
    else
	return this.toString();
};

Number.prototype.commafy = function()
{
    var thisString = this.toString();
    var length = thisString.length;
    var commaChunks = parseInt((length - 1)/3);
    var leading = length - 3*commaChunks;
    return thisString.substring(0, leading) + thisString.substring(leading).replace(/(...)/g, ",$1");
};

Number.prototype.numberRange = function()
{
    var result = [];
    for (var value = 0; value <= this; ++value)
	result.push(value);
    return result;
};

Array.prototype.joinAnd = function ()
{
    if (this.length <= 1)
	return this.join("");
    else
    {
	var lastIndex = this.length - 1;
	return this.slice(0, lastIndex).join(", ") + " and " + this[lastIndex];
    }
};

$.fn.editElement = function (callback, inputCallback)
{
    var oldValue = $(this).text();
    var input;
    if (inputCallback)
	input = inputCallback(this, oldValue);
    else if ($(this).find("input").length)
	input = false;
    else
    {
	input = $("<input></input>").val(oldValue);
	input.attr("size", oldValue.length);
    }
    if (!input)
	return;
    $(this).empty();
    $(this).append(input);
    input.focus();
    var parentElt = this;
    $(input).blur(function ()
    {
	var newValue = input.val();
	$(parentElt).text(newValue);
	if (callback)
	    callback(parentElt, newValue, oldValue);
    }).keydown(function (evt) {
	if (evt.which == 13) // enter
	    input.blur();
	else if (evt.which == 27) // escape
	{
	    input.val(oldValue);
	    input.blur();
	}
	else if (evt.which == 9) // tab
	{
	    var parent = input.parent();
	    var next = (evt.shiftKey) ? parent.prev() : parent.next();
	    if (next && $.data(next.get(0), 'events').click)
	    {
		next.trigger("click");
		evt.preventDefault();
	    }
	}
    });
    return this;
};

$.fn.makeEditable = function (callback, inputCallback)
{
    $(this).click($.proxy(function ()
    {
	$(this).editElement(callback, inputCallback);
    }, this));
    return this;
};

$.fn.setSelect = function (options, keepSelected, newSelectedValue)
{
    var select = this;
    var selectedValue = (newSelectedValue) ? newSelectedValue : select.val();
    if (typeof(options) == "number")
	options = options.numberRange();
    else if (!options)
	options = [];
    if (select.is('select'))
    {
	var value = selectedValue || '';
	select.empty();
	if (keepSelected && options.indexOf(value) < 0)
	    select.append($('<option></option>').text(value));
    }
    else
    {
	select = $("<select></select>");
	this.empty().append(select);
    }
    $.each(options, $.proxy(function (index, value)
    {
	var option = $('<option></option>').text(value);
	if (value == selectedValue)
	    option.attr('selected', true);
	select.append(option);
    }, this));
    return select;
};

$.kingdom = {};

// ====================== KingdomManager class ======================

$.kingdom.KingdomManager = Class.create(
{

    init: function ()
    {
	this.data = new $.kingdom.Choices('', 'kingdomManager');
	this.currentName = this.data.get('currentName');
	this.nameList = this.data.getArray('nameList');
	if (this.nameList.length == 0)
	    this.nameList = [''];
	this.current = new $.kingdom.Kingdom(this, this.currentName);
	this.setupMenus();
    },

    setupMenus: function ()
    {
	$('#menu').click($.proxy(this.openMenu, this));
	// one-off hooks for the menu
	$('#menuNewKingdom').click($.proxy(this.newKingdom, this));
	$('#menuImportExport').click($.proxy(this.openImportExport, this));
	// setup handlers for importExportDiv too
	$('#importExportClose').click($.proxy(this.closeImportExport, this));
	$('#importButton').click($.proxy(this.performImport, this));
    },

    updateNameList: function (name)
    {
	if (this.nameList.indexOf(name) < 0)
	{
	    this.nameList.push(name);
	    this.nameList = this.nameList.sort();
	    this.data.set('nameList', this.nameList);
	}
    },

    setCurrent: function (current)
    {
	this.current = current;
	this.currentName = current.name;
	this.data.set('currentName', this.currentName);
	this.updateNameList(this.currentName);
    },

    nameUsed: function (name)
    {
	return (this.nameList.indexOf(name) >= 0);
    },

    openMenu: function (evt)
    {
	var kingdomList = $('#kingdomList');
	kingdomList.empty();
	$.each(this.nameList, $.proxy(function (index, name)
	{
	    var link = $('<a></a>');
	    link.attr('href', '#');
	    link.click($.proxy(function ()
	    {
		this.switchKingdom(name);
	    }, this));
	    if (name.length == 0)
		link.attr('href', '#').text('Unnamed kingdom');
	    else
		link.attr('href', '#').text(name);
	    kingdomList.append(link);
	    kingdomList.append($('<br/>'));
	}, this));
	$('#menuDiv').show();
	$(document).bind('click.mainMenu', $.proxy(this.closeMenu, this));
	evt.stopPropagation();
    },

    closeMenu: function ()
    {
	$('#menuDiv').hide();
	$(document).unbind('click.mainMenu');
    },

    resetSheet: function ()
    {
	$('*').unbind();
	$('.fromKingdom').text('');
	this.current.resetSheet();
	this.setupMenus();
    },

    switchKingdom: function (name)
    {
	this.resetSheet();
	this.setCurrent(new $.kingdom.Kingdom(this, name));
    },

    newKingdom: function ()
    {
	if (this.nameUsed(''))
	    alert('There is already an unnamed kingdom');
	else
	    this.switchKingdom('');
    },

    currentKingdomNameChanged: function ()
    {
	var index = this.nameList.indexOf(this.currentName);
	if (index >= 0)
	    this.nameList.splice(index, 1);
	this.setCurrent(this.current);
    },

    deleteCurrentKingdom: function ()
    {
	var index = this.nameList.indexOf(this.currentName);
	if (index >= 0)
	    this.nameList.splice(index, 1);
	this.data.set('nameList', this.nameList);
	if (this.nameList.length > 0)
	    this.switchKingdom(this.nameList[0]);
	else
	    this.newKingdom();
    },

    openImportExport: function ()
    {
	var text = this.current.exportKingdom();
	var overlay = $('#importExportDiv');
	overlay.show();
	overlay.find('textarea').val(text);
    },

    closeImportExport: function ()
    {
	var overlay = $('#importExportDiv');
	overlay.hide();
    },

    performImport: function ()
    {
	var overlay = $('#importExportDiv');
	var importData = overlay.find('textarea').val();
	this.resetSheet();
	this.setCurrent(new $.kingdom.Kingdom(this, undefined, importData));
	overlay.hide();
    }

});

// ====================== Choices class ======================

$.kingdom.Choices = Class.create(
{

    init: function (name, basePrefix)
    {
	this.basePrefix = basePrefix || 'kingdom.';
	this.name = name || '';
	this.prefix = this.basePrefix + this.name + '.';
	if (!this.supportsLocalStorage())
	{
	    this.data = {};
	    this.isLocalStorage = false;
	    alert("Local storage not available in your browser - changes will be lost when you leave.");
	}
	else
	{
	    this.data = localStorage;
	    this.isLocalStorage = true;
	}
    },

    supportsLocalStorage: function()
    {
	return ('localStorage' in window && window['localStorage'] !== null);
    },

    set: function (name, value)
    {
	if (value instanceof Array)
	    value = value.join("|");
	this.data[this.prefix + name] = value;
	$('input[name="' + name + '"]').val(value);
    },

    get: function (name)
    {
	return this.data[this.prefix + name];
    },

    getArray: function (name)
    {
	var result = this.data[this.prefix + name];
	if (result)
	    return result.split("|");
	else
	    return [];
    },

    clear: function (name)
    {
	var value = this.data[this.prefix + name];
	if (this.isLocalStorage)
	    this.data.removeItem(this.prefix + name);
	else
	    delete(this.data[this.prefix + name]);
	return value;
    },

    getKeys: function ()
    {
	if (this.isLocalStorage)
	{
	    var result = [];
	    for (var index = 0; index < this.data.length; ++index)
	    {
		var key = this.data.key(index);
		if (key.indexOf(this.prefix) == 0)
		{
		    key = key.substring(this.prefix.length);
		    result.push(key);
		}
	    }
	    return result;
	}
	else
	    return Object.keys(this.data);
    },

    changeId: function (oldId, newId, remove)
    {
	var keys = this.getKeys();
	$.each(keys, $.proxy(function (index, key)
	{
	    if (key.indexOf(oldId) == 0)
	    {
		var value = this.clear(key)
		if (!remove)
		{
		    var newKey = newId + key.substring(oldId.length);
		    this.set(newKey, value);
		}
	    }
	}, this));
    },

    setName: function (name)
    {
	name = name || '';
	var oldPrefix = this.name.toId() + '.';
	var newPrefix = name.toId() + '.';
	this.prefix = this.basePrefix;
	this.changeId(oldPrefix, newPrefix, false);
	this.name = name;
	this.prefix = this.basePrefix + this.name + '.';
    },

    removeName: function ()
    {
	var oldPrefix = this.name.toId() + '.';
	this.prefix = this.basePrefix;
	this.changeId(oldPrefix, '', true);
    }

});

// ====================== Kingdom class ======================

$.kingdom.Kingdom = Class.create(
{

    emptyNameString: '<Enter name here>',

    init: function (kingdomManager, name, importData)
    {
	this.kingdomManager = kingdomManager;
	this.recalculateCallout = null;
	this.choices = new $.kingdom.Choices(name);
	this.data = {};
	// Handle import
	if (importData)
	    name = this.importKingdom(importData);
	// Kingdom name
	$('#kingdomName').text(name || this.emptyNameString);
	$('#kingdomName').makeEditable($.proxy(this.editKingdomName, this));
	this.name = name;
	// hook the static text inputs
	$('input[type="text"]').each($.proxy(function (index, input)
	{
	    var field = $(input).attr('name');
	    $(input).val(this.choices.get(field));
	    $(input).change($.proxy(this.inputChanged, this));
	}, this));
	this.setupSelect('roads', 'size');
	this.setupSelect('farms', 'roads');
	// SelectAffect instances
	this.alignment = new $.kingdom.SelectAffect(this, 'Alignment', null, {
	    'Lawful Good': { 'Economy': 2, 'Loyalty': 2 },
	    'Neutral Good': { 'Stability': 2, 'Loyalty': 2 },
	    'Chaotic Good': { 'Loyalty': 4 },
	    'Lawful Neutral': { 'Economy': 2, 'Stability': 2 },
	    'True Neutral': { 'Stability': 4 },
	    'Chaotic Neutral': { 'Loyalty': 2, 'Stability': 2 },
	    'Lawful Evil': { 'Economy': 4 },
	    'Neutral Evil': { 'Stability': 2, 'Economy': 2 },
	    'Chaotic Evil': { 'Loyalty': 2, 'Economy': 2 }
	});
	this.promotions = new $.kingdom.SelectAffect(this, 'Promotions', 'Edicts', {
	    'None': { 'Stability': -1 },
	    'Token': { 'Stability': 1, 'Consumption': 1 },
	    'Standard': { 'Stability': 2, 'Consumption': 2 },
	    'Aggressive': { 'Stability': 3, 'Consumption': 4 },
	    'Expansionist': { 'Stability': 4, 'Consumption': 8 }
	}, 'promotionsFactor', 'Consumption');
	this.taxation = new $.kingdom.SelectAffect(this, 'Taxation', 'Edicts', {
	    'None': { 'Loyalty': 1 },
	    'Light': { 'Economy': 1, 'Loyalty': -1 },
	    'Normal': { 'Economy': 2, 'Loyalty': -2 },
	    'Heavy': { 'Economy': 3, 'Loyalty': -4 },
	    'Overwhelming': { 'Economy': 4, 'Loyalty': -8 }
	}, 'taxationFactor', 'Loyalty');
	this.festivals = new $.kingdom.SelectAffect(this, 'Festivals', 'Edicts', {
	    'None': { 'Loyalty': -1 },
	    '1 per year': { 'Loyalty': 1, 'Consumption': 1 },
	    '6 per year': { 'Loyalty': 2, 'Consumption': 2 },
	    '12 per year': { 'Loyalty': 3, 'Consumption': 4 },
	    '23 per year': { 'Loyalty': 4, 'Consumption': 8 }
	}, 'festivalsFactor', 'Consumption');
	this.limitsTable = new $.kingdom.LimitsTable(this);
	this.peopleTable = new $.kingdom.PeopleTable(this);
	this.leaderTable = new $.kingdom.LeaderTable(this, this.peopleTable);
	this.resourceTable = new $.kingdom.ResourceTable(this);
	// load cities
	var cityNames = this.getArrayChoice('cityNames');
	this.cities = {};
	$.each(cityNames, $.proxy(function (index, cityName)
	{
	    var city = new $.kingdom.City(this, cityName);
	    this.cities[cityName] = city;
	    city.render();
	}, this));
	this.cityBuilder = new $.kingdom.CityBuilder(this);
	// Handle add city
	$('#addCityButton').click($.proxy(function ()
	{
	    new $.kingdom.City(this);
	}, this));
	// Initialise expandos
	this.setupExpandos();
	// Initial calculate
	this.scheduleRecalculate();
    },

    reset: function ()
    {
	$.each(Object.keys(this.data), $.proxy(function (index, field)
	{
	    this.set(field, 0);
	}, this));
    },

    resetSheet: function ()
    {
	this.peopleTable.resetSheet();
	this.resourceTable.resetSheet();
	this.cityNames = [];
	this.cities = {};
	$("#citiesDiv").empty();
    },

    get: function (field, defaultValue)
    {
	if (this.data[field] === undefined)
	    return defaultValue;
	else
	    return this.data[field];
    },

    set: function (field, value)
    {
	this.data[field] = value;
	this.refreshKingdomField(field);
    },

    modify: function (field, amount)
    {
	if (!this.data[field])
	{
	    this.data[field] = 0;
	    this.data[field + '_Plus'] = 0;
	    this.data[field + '_Minus'] = 0;
	}
	this.data[field] += amount;
	if (amount > 0)
	{
	    this.data[field + '_Plus'] += amount;
	    this.refreshKingdomField(field + '_Plus');
	}
	else
	{
	    this.data[field + '_Minus'] += amount;
	    this.refreshKingdomField(field + '_Minus');
	}
	for (var index = 2; index < arguments.length; index++)
	{
	    var reason = arguments[index];
	    this.modify(reason + '_' + field, amount);
	}
	this.refreshKingdomField(field);
    },

    refreshKingdomField: function(field)
    {
	var element = $('.fromKingdom.' + field);
	var value = this.data[field];
	if (element.is('.plusNumber'))
	    value = value.plus();
	else if (value && element.is('.number'))
	    value = value.commafy();
	if (!value)
	{
	    if (element.is('.number'))
		value = 0;
	    else
		value = '&nbsp;';
	}
	$(element).html(value);
    },

    editKingdomName: function (element, newValue, oldValue)
    {
	newValue = newValue.trim();
	if (oldValue == this.emptyNameString)
	    oldValue = '';
	if (newValue == this.emptyNameString)
	    newValue = '';
	if (!newValue && oldValue)
	{
	    var answer = confirm("Really delete " + oldValue + "?");
	    if (!answer)
	    {
		element.text(oldValue);
		return;
	    }
	    this.choices.removeName();
	    this.kingdomManager.deleteCurrentKingdom();
	    return;
	}
	else if (newValue && newValue != oldValue && this.kingdomManager.nameUsed(newValue))
	{
	    alert('There is already a kingdom named ' + newValue);
	    element.text(oldValue || this.emptyNameString);
	    return;
	}
	element.text(newValue || this.emptyNameString);
	this.choices.setName(newValue.toId());
	this.name = newValue;
	this.kingdomManager.currentKingdomNameChanged(newValue);
    },

    setChoice: function (field, value)
    {
	this.choices.set(field, value);
	this.scheduleRecalculate();
    },

    changeChoice: function (field, value, defaultValue)
    {
	var oldValue = this.getChoice(field, defaultValue);
	if (oldValue != value)
	{
	    this.setChoice(field, value);
	    $('[name="' + field + '"]').val(value);
	}
    },

    clearChoice: function (field)
    {
	this.scheduleRecalculate();
	return this.choices.clear(field);
    },

    getChoice: function (field, defaultValue)
    {
	if (this.choices.get(field) == undefined)
	    return defaultValue;
	else
	    return this.choices.get(field);
    },

    getArrayChoice: function (field)
    {
	return this.choices.getArray(field);
    },

    changeId: function (oldId, newId, remove)
    {
	this.choices.changeId(oldId, newId, remove);
    },

    setupSelect: function (selectName, valueField)
    {
	var select = $('[name="' + selectName + '"]');
	var max = parseInt(this.choices.get(valueField));
	var current = parseInt(this.choices.get(selectName));
	select.setSelect(max);
	select.val(current);
	select.change($.proxy(this.inputChanged, this));
    },

    getTreasury: function ()
    {
	return parseInt(this.getChoice("treasury", 0));
    },

    spendTreasury: function (amount)
    {
	this.setChoice("treasury", this.getTreasury() - amount);
    },

    inputChanged: function (evt)
    {
	var field = $(evt.target).attr('name');
	var value = $(evt.target).val();
	this.setChoice(field, value);
    },

    scheduleRecalculate: function ()
    {
	if (!this.recalculateCallout)
	    this.recalculateCallout = window.setTimeout($.proxy(this.recalculate, this), 10);
    },

    getType: function ()
    {
	var size = this.getChoice('size', 0);
	if (size <= 20)
	    return "Barony";
	else if (size <= 80)
	    return "Dutchy";
	else
	    return "Kingdom";
    },

    applyCities: function ()
    {
	$.each(this.cities, $.proxy(function (index, city)
	{
	    city.apply();
	}, this));
    },

    apply: function ()
    {
	this.modify("UnrestRate", 0);
	var unrest = this.getChoice("unrest", 0);
	this.modify("Unrest", unrest);
	this.modify("Economy", -unrest, "Unrest");
	this.modify("Loyalty", -unrest, "Unrest");
	this.modify("Stability", -unrest, "Unrest");

	var size = parseInt(this.getChoice('size', 0));
	this.modify("ControlDC", size + 20);
	this.modify("Population", size*250, "Rural");
	this.modify("Population", 0, "City");
	this.modify("Consumption", size, "Size");
	$("#kingdomType").text(this.getType());

	$('[name="roads"]').setSelect(size);
	var roads = parseInt(this.getChoice("roads", 0));
	if (roads > size)
	{
	    this.setChoice("roads", size);
	    roads = size;
	}
	this.modify("Economy", parseInt(roads/4), "Roads");
	this.modify("Stability", parseInt(roads/8), "Roads");

	$('[name="farms"]').setSelect(roads);
	if (farms > roads)
	{
	    this.setChoice("farms", roads);
	    farms = roads;
	}
	var farms = parseInt(this.getChoice("farms", 0));
	var farmsProduction = 2*farms;
	var consumption = this.get("Consumption");
	if (farmsProduction > consumption)
	    farmsProduction = consumption;
	this.modify("Consumption", -farmsProduction, "Farms");

	this.limitsTable.refresh();

    },

    recalculate: function ()
    {
	this.recalculateCallout = null;

	console.info("recalculating...");
	this.reset();

	// cities
	this.applyCities();

	// alignment modifiers
	this.alignment.apply();

	// edicts
	this.promotions.apply();
	this.taxation.apply();
	this.festivals.apply();

	// global factors
	this.apply();

	// other resources
	this.resourceTable.apply();

	this.leaderTable.apply();
    },

    exportKingdom: function ()
    {
	var text = 'Name:' + (this.name || '') + '\n';
	$.each(this.choices.getKeys(), $.proxy(function (index, key)
	{
	    text += key;
	    text += ':';
	    text += this.choices.get(key);
	    text += '\n';
	}, this));
	return text;
    },

    importKingdom: function (text)
    {
	var name;
	this.choices = undefined;
	$.each(text.split(/[\r\n]/), $.proxy(function (index, line)
	{
	    var colonPos = line.indexOf(':');
	    var key = line.substring(0, colonPos);
	    var value = line.substring(colonPos + 1);
	    if (key == 'Name')
	    {
		name = value;
		this.choices = new $.kingdom.Choices(name);
	    }
	    else if (key)
		this.setChoice(key, value);
	}, this));
	return name;
    },

    setupExpandos: function ()
    {
	$('.expando').each(function (index, element)
	{
	    var target = $(element).parent().next();
	    if ($(element).text() == '[+]')
		$(target).hide();
	    $(element).click(function ()
	    {
		$(target).toggle("fast", function ()
		{
		    if ($(target).is(":visible"))
			$(element).text("[-]");
		    else
			$(element).text("[+]");
		});
	    });
	});
    }

});

// ====================== SelectAffect class ======================

$.kingdom.SelectAffect = Class.create(
{

    init: function (kingdom, name, variety, effects, factor, factorAffecting)
    {
	this.kingdom = kingdom;
	this.name = name;
	this.variety = variety;
	this.effects = effects;
	this.factor = factor;
	this.factorAffecting = factorAffecting;
	this.select = $('[name="' + name + '"]');
	this.select.val(this.kingdom.getChoice(name));
	this.select.change($.proxy(this.selectChanged, this));
    },

    selectChanged: function ()
    {
	this.kingdom.setChoice(this.name, this.select.val());
    },

    apply: function ()
    {
	var value = this.select.val();
	var effects = this.effects[value];
	if (!effects)
	    return;
	$.each(Object.keys(effects), $.proxy(function (index, affecting)
	{
	    var amount = effects[affecting];
	    var factor = this.kingdom.get(this.factor);
	    if (!factor || index == 0 || affecting != this.factorAffecting)
		factor = 1;
	    this.kingdom.modify(affecting, parseInt(amount/factor), this.name, this.variety);
	}, this));
    }

});

// ====================== Person class ======================

$.kingdom.Person = Class.create(
{

    idPrefix: 'people.',

    statList: ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'],

    init: function (kingdom, name)
    {
	this.kingdom = kingdom;
	this.stats = {};
	this.setName(name || '');
	this.eachStat($.proxy(function (value, statName)
	{
	    this.setStat(statName, value || 10);
	}, this));
    },

    getId: function (field)
    {
	field = field || '';
	return this.idPrefix + this.nameId + field;
    },

    setName: function (newName)
    {
	var newNameId = newName.toId() + '.';
	this.kingdom.changeId(this.getId(), this.idPrefix + newNameId, !newName);
	this.name = newName;
	this.nameId = newNameId;
    },

    setStat: function (statName, strValue)
    {
	var value = parseInt(strValue);
	this.stats[statName] = value;
	this.kingdom.setChoice(this.getId(statName), value);
    },

    getStat: function (statName)
    {
	return this.stats[statName];
    },

    getStatMod: function (statName)
    {
	var value = this.stats[statName];
	if (value < 10)
	    value -= 1;
	return parseInt((value - 10)/2);
    },

    eachStat: function (callback, statList)
    {
	statList = statList || this.statList;
	$.each(statList, $.proxy(function (index, statName)
	{
	    var value = this.stats[statName];
	    if (!value)
	    {
		var statId = this.getId(statName);
		value = parseInt(this.kingdom.getChoice(statId));
		this.stats[statName] = value;
	    }
	    callback(value, statName);
	}, this));
    },

    getBestStat: function (statList)
    {
	var bestStat;
	var best;
	this.eachStat($.proxy(function (value, statName)
	{
	    if (!best || value > best)
	    {
		best = value;
		bestStat = statName;
	    }
	}, this), statList);
	return bestStat;
    }

});

// ====================== PeopleTable class ======================

$.kingdom.PeopleTable = Class.create(
{

    peopleListId: 'peopleList',

    init: function (kingdom) {
	this.kingdom = kingdom;
	this.people = {};
	this.peopleTable = $('.people tbody');
	$('#addPersonButton').click($.proxy(this.addPersonHandler, this));
	// load anyone stored in kingdom
	var peopleList = this.kingdom.getArrayChoice(this.peopleListId);
	$.each(peopleList, $.proxy(function (index, name)
	{
	    this.addPerson(new $.kingdom.Person(this.kingdom, name));
	}, this));
    },

    resetSheet: function ()
    {
	this.people = {};
	this.peopleTable.empty();
    },

    addPersonHandler: function (evt)
    {
	var person = new $.kingdom.Person(this.kingdom);
	this.addPerson(person, true);
    },

    addPerson: function (person, editNameImmediately)
    {
	this.people[person.name] = person;
	var newRow = $('<tr></tr>');
	var nameCell = $('<td></td>').text(person.name).
		makeEditable($.proxy(this.finishEditingName, this));
	newRow.append(nameCell);
	person.eachStat($.proxy(function (value, statName)
	{
	    var cell = $('<td></td>').text(value);
	    cell.makeEditable($.proxy(function (element, newValue)
	    {
		person.setStat(statName, newValue);
	    }, this));
	    newRow.append(cell);
	}, this));
	this.peopleTable.append(newRow);
	if (editNameImmediately)
	    nameCell.click();
    },

    finishEditingName: function (element, newValue, oldValue)
    {
	newValue = newValue.trim();
	if (!newValue && oldValue)
	{
	    var answer = confirm("Really delete " + oldValue + "?");
	    if (!answer)
	    {
		element.text(oldValue);
		return;
	    }
	}
	else if (newValue && newValue != oldValue && this.people[newValue])
	{
	    alert('There is already someone named ' + newValue);
	    element.text(oldValue);
	    return;
	}
	var person = this.people[oldValue];
	person.setName(newValue);
	delete(this.people[oldValue]);
	if (newValue)
	{
	    this.people[newValue] = person;
	    element.text(newValue);
	}
	else
	    $(element).parent().remove();
	this.kingdom.setChoice(this.peopleListId, Object.keys(this.people).sort());
	// TODO handle if they had a job
	if (oldValue)
	{
	}
    },

    getPerson: function (name)
    {
	return this.people[name];
    },

    getPeopleNames: function ()
    {
	return Object.keys(this.people);
    }

});

// ====================== Leader class ======================

$.kingdom.Leader = Class.create(
{

    idPrefix: 'leader.',

    init: function (kingdom, peopleTable, tbody, title, abilities, affecting, vacantText, vacant)
    {
	this.kingdom = kingdom;
	this.peopleTable = peopleTable;
	this.row = $('<tr></tr>');
	this.row.append($('<th></th>').text(title));
	this.row.append($('<td></td>'));
	this.row.append($('<td></td>'));
	this.row.append($('<td></td>'));
	this.row.append($('<td></td>').html(vacantText));
	tbody.append(this.row);
	this.title = title;
	this.abilities = abilities;
	this.setAffecting(affecting);
	this.vacant = vacant;
	this.peopleSelect = this.row.find('td').eq(0).setSelect();
	var personName = kingdom.getChoice(this.getId('name'));
	if (personName)
	{
	    this.setPerson(peopleTable.getPerson(personName));
	    this.peopleSelect.setSelect([personName]);
	}
	this.peopleSelect.change($.proxy(this.peopleSelectChanged, this));
    },

    getId: function (field)
    {
	return this.idPrefix + this.title + '.' + field;
    },

    setAffecting: function (affecting)
    {
	var cell = this.row.find('td').eq(2);
	if (!$.isArray(affecting))
	    cell.text(affecting);
	else if (affecting.length == 1)
	{
	    this.affecting = affecting[0];
	    cell.text(this.affecting);
	}
	else
	{
	    this.affecting = this.kingdom.getChoice(this.getId('affecting'), affecting[0]);
	    this.affectingSelect = cell.setSelect(affecting);
	    this.affectingSelect.val(this.affecting);
	    this.affectingSelect.change($.proxy(this.affectingSelectChanged, this));
	}
    },

    affectingSelectChanged: function (evt)
    {
	this.affecting = this.affectingSelect.val();
	this.kingdom.setChoice(this.getId('affecting'), this.affecting);
    },

    setPerson: function (person)
    {
	this.person = person;
	this.refresh();
    },

    peopleSelectChanged: function (evt)
    {
	var name = this.peopleSelect.val();
	if (name)
	    this.setPerson(this.peopleTable.getPerson(name));
	else
	    this.setPerson(null);
	this.kingdom.setChoice(this.getId('name'), name);
    },

    refresh: function ()
    {
	var bestStat;
	if (this.person)
	{
	    bestStat = this.person.getBestStat(this.abilities);
	    this.modifier = this.person.getStatMod(bestStat);
	}
	else
	    this.modifier = 0;
	var html = '';
	$.each(this.abilities, $.proxy(function (index, ability)
	{
	    if (index > 0)
		html += ' or ';
	    if (ability == bestStat)
		html += '<u>';
	    html += ability;
	    if (ability == bestStat)
		html += " (" + this.modifier.plus() + ")</u>";
	}, this));
	this.row.find('td').eq(1).html(html);
	if (this.person)
	    this.row.find('td').eq(3).addClass("notVacant");
	else
	    this.row.find('td').eq(3).removeClass("notVacant");
    },

    setRulerAffectingOptions: function ()
    {
	var type = this.kingdom.getType();
	var options;
	if (type == 'Barony')
	    options = [ 'Economy', 'Loyalty', 'Stability' ];
	else if (type == 'Dutchy')
	    options = [ 'Economy & Loyalty', 'Economy & Stability', 'Loyalty & Stability' ];
	else
	    options = [ 'Economy & Loyalty & Stability' ];
	if (options.indexOf(this.affectingSelect.val()) < 0)
	{
	    this.affectingSelect.setSelect(options);
	    this.affectingSelectChanged();
	}
    },

    apply: function ()
    {
	this.refresh();
	if (this.title == "Ruler")
	    this.setRulerAffectingOptions();
	if (this.person)
	{
	    var affecting = this.affecting;
	    if (this.title == "Ruler's Spouse")
		affecting = this.ruler.affecting;
	    var affectingList = affecting.split(' & ');
	    $.each(affectingList, $.proxy(function (index, affecting)
	    {
		this.kingdom.modify(affecting, this.modifier, "Leadership");
	    }, this));
	    if (this.title == 'Royal Assassin')
		this.kingdom.modify("UnrestRate", -1);
	}
	else
	    this.vacant();
    },

    setPeopleOptions: function (idlePeople)
    {
	var oldName = this.peopleSelect.val();
	var newName = this.person ? this.person.name : '';
	if (oldName && newName && oldName != newName)
	{
	    this.peopleSelect.setSelect(idlePeople, true, newName);
	    this.kingdom.setChoice(this.getId('name'), newName);
	}
	else
	    this.peopleSelect.setSelect(idlePeople, true);
    }

});

// ====================== LeaderTable class ======================

$.kingdom.LeaderTable = Class.create(
{

    init: function (kingdom, peopleTable)
    {
	this.kingdom = kingdom;
	this.peopleTable = peopleTable;
	this.leaders = {};
	var tbody = $('.leaders tbody');
	tbody.empty();
	this.addLeader(tbody, 'Ruler', ['Charisma'], ['Economy', 'Loyalty', 'Stability'], 'Unrest rate +4, cannot claim new hexes, create farmlands,<br/>build roads, or purchase city districts', function () {
	    this.kingdom.modify("UnrestRate", 4, "Vacancies");
	});
	this.addLeader(tbody, "Ruler's Spouse", ['Charisma'], 'Same as Ruler', 'No penalty', function () {});
	this.addLeader(tbody, 'Councilor', ['Wisdom', 'Charisma'], ['Loyalty'], 'Loyalty -2, Unrest rate +1, cannot gain benefits from festivals', function () {
	    this.kingdom.modify("Loyalty", -2, "Vacancies");
	    this.kingdom.modify("UnrestRate", 1, "Vacancies");
	    this.kingdom.changeChoice('Festivals', 'None', 'None');
	});
	this.addLeader(tbody, 'Grand Diplomat', ['Intelligence', 'Charisma'], ['Stability'], 'Stability -2, cannot issue promotion edicts', function () {
	    this.kingdom.modify("Stability", -2, "Vacancies");
	    this.kingdom.changeChoice('Promotions', 'None', 'None');
	});
	this.addLeader(tbody, 'Treasurer', ['Intelligence', 'Wisdom'], ['Economy', 'Loyalty', 'Stability'], 'Economy -4, cannot collect taxes', function () {
	    this.kingdom.modify("Economy", -4, "Vacancies");
	    this.kingdom.changeChoice('Taxation', 'None', 'None');
	});
	this.addLeader(tbody, 'General', ['Strength', 'Charisma'], ['Stability'], 'Stability -4', function () {
	    this.kingdom.modify("Stability", -4, "Vacancies");
	});
	this.addLeader(tbody, 'High Priest', ['Wisdom', 'Charisma'], ['Stability'], 'Stability -2, Loyalty -2, Unrest rate +1', function () {
	    this.kingdom.modify("Stability", -2, "Vacancies");
	    this.kingdom.modify("Loyalty", -2, "Vacancies");
	    this.kingdom.modify("UnrestRate", 1, "Vacancies");
	});
	this.addLeader(tbody, 'Magister', ['Intelligence', 'Charisma'], ['Economy'], 'Economy -4', function () {
	    this.kingdom.modify("Economy", -4, "Vacancies");
	});
	this.addLeader(tbody, 'Marshall', ['Dexterity', 'Wisdom'], ['Economy'], 'Economy -4', function () {
	    this.kingdom.modify("Economy", -4, "Vacancies");
	});
	this.addLeader(tbody, 'Royal Assassin', ['Strength', 'Dexterity'], ['Loyalty'], 'No penalty, but Unrest rate -1 if role filled', function () { });
	this.addLeader(tbody, 'Spymaster', ['Dexterity', 'Intelligence'], ['Economy', 'Loyalty', 'Stability'], 'Economy -4, Unrest rate +1', function () {
	    this.kingdom.modify("Economy", -4, "Vacancies");
	    this.kingdom.modify("UnrestRate", 1, "Vacancies");
	});
	this.addLeader(tbody, 'Warden', ['Strength', 'Constitution'], ['Loyalty'], 'Economy -4, Stability -2', function () {
	    this.kingdom.modify("Economy", -4, "Vacancies");
	    this.kingdom.modify("Stability", -2, "Vacancies");
	});
	this.leaders["Ruler's Spouse"].ruler = this.leaders["Ruler"];
    },

    addLeader: function (tbody, title, ability, affecting, vacantText, vacant)
    {
	var leader = new $.kingdom.Leader(this.kingdom, this.peopleTable, tbody, title, ability, affecting, vacantText, vacant);
	this.leaders[leader.title] = leader;
    },

    getIdlePeople: function ()
    {
	var peopleNames = this.peopleTable.getPeopleNames();
	$.each(Object.keys(this.leaders), $.proxy(function (index, title)
	{
	    var leader = this.leaders[title];
	    if (leader.person)
	    {
		var index = peopleNames.indexOf(leader.person.name);
		if (index >= 0)
		    peopleNames.splice(index, 1);
	    }
	}, this));
	return peopleNames.sort();
    },

    apply: function ()
    {
	var idlePeople = this.getIdlePeople();
	idlePeople.splice(0, 0, ''); // insert a blank as the first element
	$.each(Object.keys(this.leaders), $.proxy(function (index, title)
	{
	    var leader = this.leaders[title];
	    leader.setPeopleOptions(idlePeople);
	    leader.apply();
	}, this));
    }

});

// ====================== LimitsTable class ======================

$.kingdom.LimitsTable = Class.create(
{
    init: function (kingdom)
    {
	this.kingdom = kingdom;
    },

    limitFromArray: function (values)
    {
	var size = this.kingdom.getChoice('size', 0);
	if (size <= 10)
	    return values[0];
	else if (size <= 25)
	    return values[1];
	else if (size <= 50)
	    return values[2];
	else if (size <= 100)
	    return values[3];
	else if (size <= 200)
	    return values[4];
	else
	    return values[5];
    },

    getBuildLimitCities: function ()
    {
	return this.limitFromArray([1, 1, 1, 2, 3, 4]);
    },

    getBuildLimitBuildings: function ()
    {
	return this.limitFromArray([1, 2, 5, 10, 20, "no limit"]);
    },

    getBuildLimitHexes: function ()
    {
	return this.limitFromArray([1, 2, 3, 4, 8, 12]);
    },

    getBuildLimitRoads: function ()
    {
	return this.limitFromArray([1, 2, 3, 4, 6, 8]);
    },

    getBuildLimitFarmlands: function ()
    {
	return this.limitFromArray([1, 1, 2, 2, 3, 4]);
    },

    refresh: function ()
    {
	this.kingdom.set("limitCities", this.getBuildLimitCities());
	this.kingdom.set("limitBuildings", this.getBuildLimitBuildings());
	this.kingdom.set("limitHexes", this.getBuildLimitHexes());
	this.kingdom.set("limitRoads", this.getBuildLimitRoads());
	this.kingdom.set("limitFarmlands", this.getBuildLimitFarmlands());
    }

});

// ====================== Building class ======================

$.kingdom.Building = Class.create(
{

    buildingData: {
	'Acadamy': {
	    'size': '2x1',
	    'cost': 52,
	    'halveCost': ["Caster's Tower", "Library", "Magic Shop"],
	    'minorItems': 3,
	    'mediumItems': 2,
	    'Economy': 2,
	    'Loyalty': 2
	},
	'Alchemist': {
	    'size': '1x1',
	    'cost': 18,
	    'adjacentHouses': 1,
	    'cityValue': 1000,
	    'minorItems': 1,
	    'Economy': 1
	},
	'Arena': {
	    'size': '2x2',
	    'cost': 40,
	    'halveCost': ["Garrison", "Theater"],
	    'halveKingdom': 'Festivals',
	    'Stability': 4,
	    'onePerCity': true
	},
	'Barracks': {
	    'size': '1x1',
	    'cost': 12,
	    'Defense': 2,
	    'Unrest': -1
	},
	'Black Market': {
	    'size': '1x1',
	    'cost': 50,
	    'adjacentHouses': 2,
	    'cityValue': 2000,
	    'minorItems': 2,
	    'mediumItems': 1,
	    'majorItems': 1,
	    'Economy': 2,
	    'Stability': 2,
	    'Unrest': 1
	},
	'Brewery': {
	    'size': '1x1',
	    'cost': 6,
	    'Loyalty': 1,
	    'Stability': 1
	},
	'Brothel': {
	    'size': '1x1',
	    'cost': 4,
	    'adjacentHouses': 1,
	    'Economy': 1,
	    'Loyalty': 2,
	    'Unrest': 1
	},
	"Caster's Tower": {
	    'size': '1x1',
	    'cost': 30,
	    'minorItems': 3,
	    'mediumItems': 2,
	    'Economy': 1,
	    'Loyalty': 1
	},
	'Castle': {
	    'size': '2x2',
	    'cost': 54,
	    'halveCost': ["Noble Villa", "Town Hall"],
	    'Economy': 2,
	    'Loyalty': 2,
	    'Stability': 2,
	    'Defense': 8,
	    'Unrest': -4,
	    'onePerCity': true
	},
	'Cathedral': {
	    'size': '2x2',
	    'cost': 58,
	    'halveCost': ["Temple", "Acadamy"],
	    'halveKingdom': 'Promotions',
	    'minorItems': 3,
	    'mediumItems': 2,
	    'Loyalty': 4,
	    'Unrest': -4,
	    'onePerCity': true
	},
	'City Wall': {
	    'size': 'border',
	    'borderColour': '#666666',
	    'borderZ': 3,
	    'cost': 8,
	    'Defense': 4,
	    'Unrest': -2
	},
	'Dump': {
	    'size': '1x1',
	    'cost': 4,
	    'Stability': 1
	},
	'Exotic Craftsman': {
	    'size': '1x1',
	    'cost': 10,
	    'adjacentHouses': 1,
	    'minorItems': 1,
	    'Economy': 1,
	    'Stability': 1
	},
	'Garrison': {
	    'size': '2x1',
	    'cost': 28,
	    'halveCost': ["City Wall", "Granary", "Jail"],
	    'Loyalty': 2,
	    'Stability': 2,
	    'Unrest': -2,
	},
	'Granary': {
	    'size': '1x1',
	    'cost': 12,
	    'Loyalty': 1,
	    'Stability': 1
	},
	'Graveyard': {
	    'size': '1x1',
	    'cost': 4,
	    'Loyalty': 1
	},
	'Guildhall': {
	    'size': '2x1',
	    'cost': 34,
	    'adjacentHouses': 1,
	    'cityValue': 1000,
	    'halveCost': ["Pier", "Stable", "Tradesman"],
	    'Economy': 2,
	    'Loyalty': 2
	},
	'Herbalist': {
	    'size': '1x1',
	    'cost': 10,
	    'adjacentHouses': 1,
	    'minorItems': 1,
	    'Loyalty': 1,
	    'Stability': 1
	},
	'House': {
	    'size': '1x1',
	    'cost': 3,
	    'extraBuild': 1,
	    'isHouse': true,
	    'Unrest': -1
	},
	'Inn': {
	    'size': '1x1',
	    'cost': 10,
	    'adjacentHouses': 1,
	    'cityValue': 500,
	    'Economy': 1,
	    'Loyalty': 1
	},
	'Jail': {
	    'size': '1x1',
	    'cost': 14,
	    'Loyalty': 2,
	    'Stability': 2,
	    'Unrest': -2
	},
	'Land': {
	    'size': 'border',
	    'borderColour': '#97974F',
	    'borderZ': 1,
	    'onlyEmpty': true,
	    'cost': 0
	},
	'Library': {
	    'size': '1x1',
	    'cost': 6,
	    'Economy': 1,
	    'Loyalty': 1
	},
	'Luxury Store': {
	    'size': '1x1',
	    'cost': 28,
	    'adjacentHouses': 1,
	    'cityValue': 2000,
	    'minorItems': 2,
	    'Economy': 1
	},
	'Magic Shop': {
	    'size': '1x1',
	    'cost': 68,
	    'adjacentHouses': 2,
	    'cityValue': 2000,
	    'minorItems': 4,
	    'mediumItems': 2,
	    'majorItems': 1,
	    'Economy': 1
	},
	'Mansion': {
	    'size': '1x1',
	    'cost': 10,
	    'Stability': 1
	},
	'Market': {
	    'size': '2x1',
	    'cost': 48,
	    'adjacentHouses': 2,
	    'cityValue': 2000,
	    'halveCost': ["Black Market", "Inn", "Shop"],
	    'minorItems': 2,
	    'Economy': 2,
	    'Stability': 2
	},
	'Mill': {
	    'size': '1x1',
	    'cost': 6,
	    'adjacentWater': true,
	    'Economy': 1,
	    'Stability': 1
	},
	'Monument': {
	    'size': '1x1',
	    'cost': 6,
	    'Loyalty': 3,
	    'Unrest': -1
	},
	'Noble Villa': {
	    'size': '2x1',
	    'cost': 24,
	    'halveCost': ["Exotic Craftsman", "Luxury Store", "Mansion"],
	    'Economy': 1,
	    'Loyalty': 1,
	    'Stability': 1
	},
	'Park': {
	    'size': '1x1',
	    'cost': 4,
	    'Loyalty': 1,
	    'Unrest': -1
	},
	'Pier': {
	    'size': '1x1',
	    'cost': 16,
	    'adjacentWater': true,
	    'cityValue': 1000,
	    'Economy': 1,
	    'Stability': 1
	},
	'Shop': {
	    'size': '1x1',
	    'cost': 8,
	    'adjacentHouses': 1,
	    'cityValue': 500,
	    'Economy': 1
	},
	'Shrine': {
	    'size': '1x1',
	    'cost': 8,
	    'minorItems': 1,
	    'Loyalty': 1,
	    'Unrest': -1
	},
	'Smith': {
	    'size': '1x1',
	    'cost': 6,
	    'Economy': 1,
	    'Stability': 1
	},
	'Stable': {
	    'size': '1x1',
	    'cost': 10,
	    'adjacentHouses': 1,
	    'cityValue': 500,
	    'Economy': 1,
	    'Loyalty': 1
	},
	'Tannery': {
	    'size': '1x1',
	    'cost': 6,
	    'noAdjacentHouses': true,
	    'Economy': 1,
	    'Stability': 1
	},
	'Tavern': {
	    'size': '1x1',
	    'cost': 12,
	    'adjacentHouses': 1,
	    'cityValue': 500,
	    'Economy': 1,
	    'Loyalty': 1
	},
	'Temple': {
	    'size': '2x1',
	    'cost': 32,
	    'halveCost': ["Graveyard", "Monument", "Shrine"],
	    'minorItems': 2,
	    'Loyalty': 2,
	    'Stability': 2,
	    'Unrest': -2
	},
	'Tenement': {
	    'size': '1x1',
	    'cost': 1,
	    'Unrest': 2,
	    'isHouse': true,
	    'upgradeTo': "House"
	},
	'Theater': {
	    'size': '2x1',
	    'cost': 24,
	    'halveCost': ["Brothel", "Park", "Tavern"],
	    'Economy': 2,
	    'Stability': 2
	},
	'Town Hall': {
	    'size': '2x1',
	    'cost': 22,
	    'halveCost': ["Barracks", "Dump", "Watchtower"],
	    'Economy': 1,
	    'Loyalty': 1,
	    'Stability': 1
	},
	'Tradesman': {
	    'size': '1x1',
	    'cost': 10,
	    'adjacentHouses': 1,
	    'cityValue': 500,
	    'Economy': 1,
	    'Stability': 1
	},
	'Watchtower': {
	    'size': '1x1',
	    'cost': 6,
	    'Stability': 1,
	    'Defense': 2,
	    'Unrest': -1
	},
	'Water': {
	    'size': 'border',
	    'borderColour': '#7777ff',
	    'borderZ': 2,
	    'onlyEmpty': true,
	    'cost': 0
	},
	'Waterfront': {
	    'size': '2x2',
	    'cost': 90,
	    'adjacentWater': true,
	    'cityValue': 4000,
	    'minorItems': 3,
	    'mediumItems': 2,
	    'majorItems': 1,
	    'halveCost': ["Guildhall", "Market"],
	    'halveKingdom': 'Taxation',
	    'Economy': 4,
	    'onePerCity': true
	}
    },

    init: function (name)
    {
	if (!this.buildingData[name])
	    alert('Unknown building "' + name + '"');
	$.extend(this, this.buildingData[name]);
	this.name = name;
	this.image = "images/" + name + ".png";
	if (this.upgradeTo)
	{
	    this.upgradeTo = new $.kingdom.Building(this.upgradeTo);
	    this.upgradeTo.cost -= this.cost;
	}
    },

    toString: function ()
    {
	var result = this.name;
	if (this.onePerCity)
	    result += "\nOnly one per city.";
	if (this.adjacentHouses)
	    result += "\nMust be adjacent to at least " + this.adjacentHouses + " house" + ((this.adjacentHouses > 1) ? "s." : ".");
	if (this.adjacentWater)
	    result += "\nMust be adjacent to a water border.";
	if (this.noAdjacentHouses)
	    result += "\nMust not be adjacent to any houses.";
	if (this.halveCost)
	    result += "\nHalves the cost of " + this.halveCost.joinAnd() + " in this city.";
	if (this.cityValue)
	    result += "\nCity Base Value " + this.cityValue.plus() + ".";
	if (this.Unrest)
	    result += "\nOne-off Unrest change of " + this.Unrest.plus() + ".";
	if (this.Economy)
	    result += "\nKingdom Economy " + this.Economy.plus() + ".";
	if (this.Loyalty)
	    result += "\nKingdom Loyalty " + this.Loyalty.plus() + ".";
	if (this.Stability)
	    result += "\nKingdom Stability " + this.Stability.plus() + ".";
	if (this.Defense)
	    result += "\nCity Defense " + this.Defense.plus() + ".";
	var items = [];
	if (this.minorItems)
	    items.push(this.minorItems.plus() + " minor item" +
		    (this.minorItems > 1 ? "s" : ""));
	if (this.mediumItems)
	    items.push(this.mediumItems.plus() + " medium item" +
		    (this.mediumItems > 1 ? "s" : ""));
	if (this.majorItems)
	    items.push(this.majorItems.plus() + " major item" +
		    (this.majorItems > 1 ? "s" : ""));
	if (items.length)
	    result += "\n" + items.joinAnd() + ".";
	if (this.halveKingdom)
	    result += "\nHalves the overhead of " + this.halveKingdom + " Kingdom-wide.";
	return result;
    },

    apply: function (city)
    {
	if (this.halveCost)
	{
	    $.each(this.halveCost, function (index, building)
	    {
		city.halfCost[building] = true;
	    });
	}
	if (this.minorItems)
	    city.minorItems += this.minorItems;
	if (this.mediumItems)
	    city.mediumItems += this.mediumItems;
	if (this.majorItems)
	    city.majorItems += this.majorItems;
	if (this.cityValue)
	    city.value += this.cityValue;
	if (this.halveKingdom)
	{
	    var factorName = this.halveKingdom + 'Factor';
	    var factor = city.kingdom.get(factorName, 1);
	    city.kingdom.set(factorName, factor*2);
	}
	if (this.Economy)
	    city.kingdom.modify("Economy", this.Economy, "Buildings");
	if (this.Loyalty)
	    city.kingdom.modify("Loyalty", this.Loyalty, "Buildings");
	if (this.Stability)
	    city.kingdom.modify("Stability", this.Stability, "Buildings");
	if (this.onePerCity)
	{
	    if (city.onlyOne[this.name])
		alert("City " + city.name + " has more than one " + this.name);
	    city.onlyOne[this.name] = true;
	}
	if (this.Defense)
	    city.defense += this.Defense;
	var population;
	if (this.size == '1x1')
	    population = 250;
	else if (this.size == '2x1')
	    population = 500;
	else if (this.size == '2x2')
	    population = 1000;
	if (population)
	{
	    city.kingdom.modify("Population", population, "City");
	    city.population += population;
	}
    }

});

$.kingdom.Building.buildings = {};

$.kingdom.Building.get = function (name)
{
    if (!this.buildings[name])
	this.buildings[name] = new $.kingdom.Building(name);
    return this.buildings[name];
};

$.kingdom.Building.eachBuilding = function (callback)
{
    var nameList = Object.keys($.kingdom.Building.prototype.buildingData);
    $.each(nameList, function (index, name)
    {
	var building = $.kingdom.Building.get(name);
	callback(building);
    });
};

// ====================== District class ======================

$.kingdom.District = Class.create(
{

    bigBuilding: {},

    init: function (city, districtIndex)
    {
	this.city = city;
	this.districtIndex = districtIndex;
	this.load();
    },

    load: function ()
    {
	this.buildings = [];
	var text = this.city.kingdom.getChoice(this.city.getId(this.districtIndex));
	if (text)
	{
	    $.each(text.split(","), $.proxy(function (index, name)
	    {
		var pair = name.split(":");
		var index = this.sideToIndex(pair[0]);
		if (!index)
		    index = parseInt(pair[0]);
		var name = $.trim(pair[1]);
		if (name == 'continue')
		    this.buildings[index] = this.bigBuilding;
		else
		    this.buildings[index] = $.kingdom.Building.get(name);
	    }, this));
	}
	else
	{
	    var land = $.kingdom.Building.get('Land');
	    this.buildings[this.sideToIndex('top')] = land;
	    this.buildings[this.sideToIndex('bottom')] = land;
	    this.buildings[this.sideToIndex('left')] = land;
	    this.buildings[this.sideToIndex('right')] = land;
	}
    },

    save: function ()
    {
	var text = "";
	$.each(this.buildings, $.proxy(function (index, building)
	{
	    if (building)
	    {
		if (text)
		    text += ",";
		var side = this.indexToSide(index);
		if (side)
		    text += side;
		else
		    text += index;
		if (building == this.bigBuilding)
		    text += ":continue";
		else
		    text += ":" + building.name;
	    }
	}, this));
	this.city.kingdom.setChoice(this.city.getId(this.districtIndex), text);
    },

    sideToIndex: function (side)
    {
	if (side == 'top')
	    return 36;
	else if (side == 'bottom')
	    return 37;
	else if (side == 'left')
	    return 38;
	else if (side == 'right')
	    return 39;
    },

    indexToSide: function (index)
    {
	if (index == 36)
	    return 'top';
	else if (index == 37)
	    return 'bottom';
	else if (index == 38)
	    return 'left';
	else if (index == 39)
	    return 'right';
    },

    oppositeSide: function (side)
    {
	if (side == 'top')
	    return 'bottom';
	else if (side == 'bottom')
	    return 'top';
	else if (side == 'left')
	    return 'right';
	else if (side == 'right')
	    return 'left';
    },

    renderBlock: function (x, y, index)
    {
	var building = this.buildings[index];
	var square;
	if (building)
	{
	    if (!building.image)
		return;
	    square = $("<img></img>").attr("src", building.image);
	    square.attr("title", building.toString());
	    if (building.size == '2x1')
	    {
		if (this.buildings[index + 2] && !this.buildings[index + 2].image)
		{
		    square.css({
			'transform': 'rotate(90deg)',
			'-ms-transform': 'rotate(90deg)',
			'-moz-transform': 'rotate(90deg)',
			'-webkit-transform': 'rotate(90deg)',
			'-o-transform': 'rotate(90deg)'
		    });
		    x -= 36;
		    y += 41;
		}
	    }
	}
	else
	{
	    square = $("<div></div>");
	    square.addClass("square");
	}
	square.attr("index", index);
	square.click($.proxy(this.clickBuilding, this));
	square.css({ 'top': y, 'left': x });
	$(this.div).append(square);
    },

    clickBuilding: function (evt)
    {
	var target = evt.target;
	var index = $(target).attr("index");
	this.city.kingdom.cityBuilder.select(evt, target, this, index);
    },

    renderSquare: function (x, y, index)
    {
	this.renderBlock(x, y, index);
	this.renderBlock(x + 80, y, index + 1);
	this.renderBlock(x, y + 80, index + 2);
	this.renderBlock(x + 80, y + 80, index + 3);
    },

    renderBorder: function (side)
    {
	var index = this.sideToIndex(side);
	var border = this.buildings[index];
	if (border)
	{
	    var borderDiv = $('<div></div>').addClass('border');
	    borderDiv.addClass(side);
	    borderDiv.attr('title', border.toString());
	    borderDiv.css({ 'background-color': border.borderColour,
		    'z-index': border.borderZ });
	    borderDiv.attr("index", index);
	    borderDiv.click($.proxy(this.clickBuilding, this));
	    $(this.div).append(borderDiv);
	}
    },

    renderBorders: function ()
    {
	this.renderBorder('top');
	this.renderBorder('bottom');
	this.renderBorder('left');
	this.renderBorder('right');
    },

    render: function (parentElt)
    {
	if (this.div)
	    this.div.empty();
	else
	    this.div = $("<div></div>").addClass("cityDistrict");
	parentElt.append(this.div);
	var index = 0;
	for (var y = 0; y <= 400; y += 200)
	    for (var x = 0; x <= 400; x += 200)
	    {
		this.renderSquare(x, y, index);
		index += 4;
	    }
	this.renderBorders();
    },

    apply: function ()
    {
	this.city.kingdom.modify("Consumption", 1, "City District");
	$.each(this.buildings, $.proxy(function (index, building)
	{
	    if (building && building != this.bigBuilding)
		building.apply(this.city);
	}, this));
    },

    houseCount: function (building)
    {
	return (building && building.isHouse) ? 1 : 0;
    },

    countAdjacentHouses: function (index)
    {
	var baseIndex = index & ~3;
	var houses = 0;
	houses += this.houseCount(this.buildings[baseIndex]);
	houses += this.houseCount(this.buildings[baseIndex + 1]);
	houses += this.houseCount(this.buildings[baseIndex + 2]);
	houses += this.houseCount(this.buildings[baseIndex + 3]);
	return houses;
    },

    getMinimumHouses: function (minimum, building)
    {
	if (building && building.adjacentHouses && building.adjacentHouses > minimum)
	    minimum = building.adjacentHouses;
	return minimum;
    },

    getMinimumHousesForSquare: function (index)
    {
	var baseIndex = index & ~3;
	var minimum = this.getMinimumHouses(0, this.buildings[baseIndex]);
	minimum = this.getMinimumHouses(minimum, this.buildings[baseIndex + 1]);
	minimum = this.getMinimumHouses(minimum, this.buildings[baseIndex + 2]);
	minimum = this.getMinimumHouses(minimum, this.buildings[baseIndex + 3]);
	return minimum;
    },

    noAdjacentHousesBuildingName: function (index)
    {
	var building = this.buildings[index];
	return (building && building.noAdjacentHouses) ? building.name : null;
    },

    noHousesAllowedCheck: function (index)
    {
	var baseIndex = index & ~3;
	return (this.noAdjacentHousesBuildingName(baseIndex) ||
		this.noAdjacentHousesBuildingName(baseIndex + 1) ||
		this.noAdjacentHousesBuildingName(baseIndex + 2) ||
		this.noAdjacentHousesBuildingName(baseIndex + 3));
    },

    canDemolish: function (index)
    {
	var building = this.buildings[index];
	if (building && building.isHouse)
	{
	    var houses = this.countAdjacentHouses(index);
	    var minimumHouses = this.getMinimumHousesForSquare(index);
	    if (houses - 1 < minimumHouses)
		return false;
	}
	return true;
    },

    get2x1ContinueIndex: function (index)
    {
	if ((index & 3) == 2 || this.buildings[index + 1] == this.bigBuilding)
	    return index + 1;
	else
	    return index + 2;
    },

    clearBuilding: function(index)
    {
	var building = this.buildings[index];
	this.buildings[index] = null;
	var size = building.size;
	if (size == '2x1')
	{
	    this.buildings[this.get2x1ContinueIndex(index)] = null;
	}
	else if (size == '2x2')
	{
	    this.buildings[index + 1] = null;
	    this.buildings[index + 2] = null;
	    this.buildings[index + 3] = null;
	}
	this.save();
	this.city.render();
	return building;
    },

    /*
    * @param index The index of the 2x1 building
    * @param edge The block's edge: 0 = top, 1 = right, 2 = bottom, 3 = left
    * @param move True if the call should actually move the building, false to just test if it's legal.
    */
    move2x1ToEdge: function (index, edge, move)
    {
	var continueIndex = this.get2x1ContinueIndex(index);
	var edgeBase = (index & ~3) + ((edge == 3) ? 0 : edge);
	var edgeContinue = edgeBase + ((edge & 1) ? 2 : 1);
	if ((edgeBase == index && edgeContinue == continueIndex) ||
		(edgeBase != index && edgeBase != continueIndex && this.buildings[edgeBase]) ||
		(edgeContinue != index && edgeContinue != continueIndex && this.buildings[edgeContinue]))
	    return false;
	if (move)
	{
	    var building = this.clearBuilding(index);
	    this.buildings[edgeBase] = building;
	    this.buildings[edgeContinue] = this.bigBuilding;
	    this.save();
	    this.city.render();
	}
	return true;
    },

    isWaterBorder: function (side)
    {
	var borderIndex = this.sideToIndex(side);
	var border = this.buildings[borderIndex];
	if (border)
	    return (border.name == 'Water');
	else
	{
	    var neighbour = this.districtTo(side);
	    return neighbour.isWaterBorder(this.oppositeSide(side));
	}
    },

    isAdjacentToWater: function (index, building)
    {
	var square = parseInt(index / 4);
	var isTop = (square < 3);
	var isBottom = (square >= 6);
	var isLeft = (square % 3) == 0;
	var isRight = (square % 3) == 2;
	var building = building || this.buildings[index];
	if (building && building.size != '2x2')
	{
	    var corner = index & 3;
	    isTop &= (corner < 2);
	    isBottom &= (corner >= 2);
	    isLeft &= (corner % 2) == 0;
	    isRight &= (corner % 2) == 1;
	}
	return ((isTop && this.isWaterBorder('top')) ||
		(isBottom && this.isWaterBorder('bottom')) ||
		(isLeft && this.isWaterBorder('left')) ||
		(isRight && this.isWaterBorder('right')));
    },

    buildingCost: function (building)
    {
	var cost = building.cost;
	if (this.city.halfCost[building.name])
	    cost /= 2;
	return cost;
    },

    setBuilding: function (building, index)
    {
	if (building.size == '2x1')
	{
	    var horz = (index & 1) ? -1 : 1;
	    if (!this.buildings[index + horz] &&
		    ((index&3) != 1 || this.buildings[index + 2]))
	    {
		index &= ~1;
		this.buildings[index + 1] = this.bigBuilding
	    }
	    else
	    {
		index &= ~2;
		this.buildings[index + 2] = this.bigBuilding
	    }
	}
	else if (building.size == '2x2')
	{
	    var index = index & ~3;
	    this.buildings[index + 1] = this.bigBuilding;
	    this.buildings[index + 2] = this.bigBuilding;
	    this.buildings[index + 3] = this.bigBuilding;
	}
	this.buildings[index] = building;
	this.save();
	this.city.render();
    },

    getBuildingProblem: function(building, index)
    {
	var problem;
	if (this.buildings[index] && this.buildings[index].upgradeTo == building)
	    ; // upgrades bypass many of the checks
	else if (building.onePerCity && this.city.onlyOne[building.name])
	    problem = "already one in this city";
	else if (building.adjacentWater && !this.isAdjacentToWater(index, building))
	    problem = "not adjacent to a water border";
	else if (building.adjacentHouses && this.countAdjacentHouses(index) < building.adjacentHouses)
	    problem = "not adjacent to at least " + building.adjacentHouses + " house" + ((building.adjacentHouses > 1) ? "s" : "");
	else if (building.noAdjacentHouses && this.countAdjacentHouses(index) > 0)
	    problem = "adjacent to houses";
	else if (building.isHouse && this.noHousesAllowedCheck(index))
	    problem = "no houses allowed adjacent to " + this.noHousesAllowedCheck(index);
	if (building.size == "2x1")
	{
	    var horz = (index & 1) ? -1 : 1;
	    var vert = (index & 2) ? -2 : 2;
	    if (this.buildings[index + horz] && this.buildings[index + vert])
		problem = "not enough room";
	}
	else if (building.size == "2x2")
	{
	    var baseIndex = index & (~3);
	    if (this.buildings[baseIndex] ||
		    this.buildings[baseIndex + 1] ||
		    this.buildings[baseIndex + 2] ||
		    this.buildings[baseIndex + 3])
		problem = "not enough room";
	}
	else if (building.onlyEmpty && !this.isEmpty())
	    problem = "can only be set on empty districts";
	if (!problem)
	{
	    var cost = this.buildingCost(building);
	    var treasury = this.city.kingdom.getTreasury();
	    if (cost > treasury)
		problem = 'too expensive (' + cost + ' BP)';
	}
	return problem;
    },

    isEmpty: function ()
    {
	var result = true;
	$.each(this.buildings, $.proxy(function (index, building)
	{
	    if (building && !this.indexToSide(index))
		result = false;
	}, this));
	return result;
    },

    getExtensionCoords: function (side)
    {
	var result = this.city.districtMap[this.districtIndex].slice();
	if (side == 'top')
	    result[1] -= 1;
	else if (side == 'bottom')
	    result[1] += 1;
	else if (side == 'left')
	    result[0] -= 1;
	else if (side == 'right')
	    result[0] += 1;
	return result;
    },

    districtTo: function (side)
    {
	var index = this.sideToIndex(side);
	var border = this.buildings[index];
	var coords = this.getExtensionCoords(side);
	var result = null;
	$.each(this.city.districtMap, $.proxy(function (index, value)
	{
	    if (value[0] == coords[0] && value[1] == coords[1])
		result = this.city.districts[index];
	}, this));
	return result;
    },

    extendCity: function (side)
    {
	var coords = this.getExtensionCoords(side);
	this.city.extend(coords);
    },

    rationaliseBorder: function (side)
    {
	var otherDistrict = this.districtTo(side);
	if (otherDistrict)
	    this.buildings[this.sideToIndex(side)] = undefined;
    }

});

// ====================== City class ======================

$.kingdom.City = Class.create(
{

    init: function (kingdom, name)
    {
	this.kingdom = kingdom;
	this.terrain = null;
	this.name = name || "";
	this.reset();
	this.load();
	this.render();
	if (!name)
	{
	    this.save();
	    this.nameElement.editElement($.proxy(this.finishEditingCityName, this));
	}
    },

    reset: function ()
    {
	this.value = 200;
	this.minorItems = 0;
	this.mediumItems = 0;
	this.majorItems = 0;
	this.halfCost = {};
	this.onlyOne = {};
	this.defense = 0;
	this.population = 0;
    },

    getId: function (field)
    {
	var cityNameId = this.name.toId();
	return "city." + cityNameId + "." + field;
    },

    load: function ()
    {
	this.terrain = this.kingdom.getChoice(this.getId("terrain"));
	if (this.terrain == "undefined")
	    this.terrain = undefined;
	var districtMap = this.kingdom.getArrayChoice(this.getId("districts"));
	this.districtMap = $.map(districtMap, function (value)
	{
	    var coords = value.split(",");
	    return [ [ parseInt(coords[0]), parseInt(coords[1]) ] ];
	});
	if (this.districtMap.length == 0)
	    this.districtMap = [ [0,0] ];
	this.districts = [ ];
	for (var index = 0; index < this.districtMap.length; ++index)
	{
	    var district = new $.kingdom.District(this, index);
	    this.districts.push(district);
	}
    },

    save: function ()
    {
	this.kingdom.setChoice(this.getId("terrain"), this.terrain);
	var districtMap = $.map(this.districtMap, function (value)
	{
	    return value.join(",");
	});
	this.kingdom.setChoice(this.getId("districts"), districtMap);
	for (var index = 0; index < this.districts.length; ++index)
	    this.districts[index].save();
	while (this.kingdom.getChoice(this.getId(index)) != undefined)
	{
	    this.kingdom.clearChoice(this.getId(index));
	    index++;
	}
	this.kingdom.setChoice("cityNames", Object.keys(this.kingdom.cities));
    },

    finishEditingCityName: function (element, newValue, oldValue)
    {
	if (newValue.match(/^\s*$/))
	    newValue = "";
	if (newValue == oldValue && newValue)
	    return;
	if (newValue && this.kingdom.cities[newValue])
	{
	    alert("There is already a city with the name of " + newValue);
	    element.text(oldValue);
	    if (oldValue)
		return;
	    else
		newValue = "";
	}
	if (newValue)
	{
	    var oldId = this.getId('');
	    this.name = newValue;
	    this.kingdom.cities[newValue] = this
	    delete this.kingdom.cities[oldValue];
	    this.kingdom.changeId(oldId, this.getId(''));
	    this.render();
	}
	else
	{
	    // removing a city - confirm
	    if (oldValue)
	    {
		var answer = confirm("Really delete " + this.name + "?");
		if (!answer)
		{
		    element.text(this.name);
		    return;
		}
	    }
	    this.parentDiv.remove();
	    delete this.kingdom.cities[oldValue];
	    this.kingdom.changeId(this.getId(''), '', true);
	}
	this.kingdom.setChoice("cityNames", Object.keys(this.kingdom.cities));
    },

    getDistrictCost: function ()
    {
	if (this.terrain == 'Forest')
	    return 4;
	else if (this.terrain == 'Plains')
	    return 1;
	else if (this.terrain == 'Hills')
	    return 2;
	else if (this.terrain == 'Mountains')
	    return 12;
	else if (this.terrain == 'Swamp')
	    return 8;
    },

    getDistrictDelay: function ()
    {
	if (this.terrain == 'Forest')
	    return '2 months';
	else if (this.terrain == 'Plains')
	    return 'no extra time';
	else if (this.terrain == 'Hills')
	    return '1 month';
	else if (this.terrain == 'Mountains')
	    return '4 months';
	else if (this.terrain == 'Swamp')
	    return '3 months';
    },

    appendTerrain: function (element)
    {
	var text = this.terrain;
	var cost = this.getDistrictCost();
	var delay = this.getDistrictDelay();
	text += " (preparing a district costs " + cost + " BP and takes " + delay + ")";
	element.append($("<span></span>").text(text));
    },

    render: function ()
    {
	if (!this.parentDiv)
	{
	    this.parentDiv = $('<div></div>');
	    $("#citiesDiv").append(this.parentDiv);
	    this.header = $("<h2></h2>").text("The city of ");
	    this.parentDiv.append(this.header);
	    this.nameElement = $("<span></span>").text(this.name);
	    this.nameElement.makeEditable($.proxy(this.finishEditingCityName, this));
	    var terrainText = $('<p></p>').text("A city in the ");
	    if (this.terrain)
		this.appendTerrain(terrainText);
	    else
	    {
		var terrainSpan = $('<span></span>');
		terrainText.append(terrainSpan);
		var terrainSelect = terrainSpan.setSelect([ "", "Forest", "Plains", "Hills", "Mountains", "Swamp" ]);
		terrainSelect.attr('name', this.getId(this.name, "terrain"));
		terrainSelect.change($.proxy(function (evt)
		{
		    this.terrain = terrainSelect.val();
		    terrainSelect.remove();
		    this.appendTerrain(terrainText);
		    this.save();
		    var cost = this.getDistrictCost();
		    this.kingdom.spendTreasury(cost);
		}, this));
	    }
	    this.parentDiv.append(terrainText);
	    this.header.append(this.nameElement);
	    this.statblock = $("<div></div>");
	    this.parentDiv.append(this.statblock);
	    this.table = $("<table></table>");
	    this.table.addClass("city");
	    this.parentDiv.append(this.table);
	}
	var map = {};
	var minRow = 0, minCol = 0;
	var maxRow = 0, maxCol = 0;
	$.each(this.districtMap, $.proxy(function (index, value)
	{
	    if (value[0] > maxCol)
		maxCol = value[0];
	    else if (value[0] < minCol)
		minCol = value[0];
	    if (value[1] > maxRow)
		maxRow = value[1];
	    else if (value[1] < minRow)
		minRow = value[1];
	    map[value.join(',')] = index;
	}, this));
	this.table.empty();
	for (var row = minRow; row <= maxRow; ++row)
	{
	    var tr = $('<tr></tr>');
	    this.table.append(tr);
	    for (var col = minCol; col <= maxCol; ++col)
	    {
		var td = $('<td></td>');
		tr.append(td);
		var districtIndex = map[col + ',' + row];
		if (districtIndex != undefined)
		    this.districts[districtIndex].render(td);
	    }
	}
	this.refreshStats();
    },

    refreshStats: function ()
    {
	var output = "";
	output += "<b>Districts:</b> " + this.districts.length + "<br/>";
	output += "<b>Base Value:</b> " + this.value.commafy() + " gp<br/>";
	output += "<b>Defense:</b> " + this.defense + "<br/>";
	output += "<b>Population:</b> " + this.population.commafy() + "<br/>";
	output += "<b>Half cost buildings:</b> " + Object.keys(this.halfCost).sort().joinAnd() + "<br/>";
	output += "<b>Minor items:</b> " + this.minorItems + "<br/>";
	output += "<b>Medium items:</b> " + this.mediumItems + "<br/>";
	output += "<b>Major items:</b> " + this.majorItems + "<br/>";
	this.statblock.html(output);
    },

    apply: function ()
    {
	this.reset();
	$.each(this.districts, function (index, district)
	{
	    district.apply();
	});
	this.refreshStats();
    },

    extend: function (coords)
    {
	var newIndex = this.districts.length;
	var newDistrict = new $.kingdom.District(this, newIndex);
	this.districts.push(newDistrict);
	this.districtMap.push(coords);
	newDistrict.rationaliseBorder('top');
	newDistrict.rationaliseBorder('bottom');
	newDistrict.rationaliseBorder('left');
	newDistrict.rationaliseBorder('right');
	this.save();
	this.render();
    }

});

// ====================== CityBuilder class ======================

$.kingdom.CityBuilder = Class.create(
{

    init: function (kingdom)
    {
	this.kingdom = kingdom;
	this.menu = $('#buildSelect');
    },

    select: function (evt, target, district, index)
    {
	this.close();
	this.target = $(target);
	this.district = district;
	this.index = parseInt(index);
	this.target.addClass("buildingSite");
	if (this.district.indexToSide(index))
	    this.selectBorder(evt);
	else if (this.district.buildings[this.index])
	    this.selectBuilding(evt);
	else
	    this.selectEmptySite(evt);
	evt.stopPropagation();
    },

    openMenu: function (evt)
    {
	this.menu.show();
	this.colWidth = 50;
	$(document).bind("click.buildMenu", $.proxy(this.close, this));
	this.menu.css({ 'left': evt.pageX, 'top': evt.pageY });
	this.menu.empty();
	this.twoCol = null;
    },

    startTwoColumn: function ()
    {
	this.twoCol = $("<div></div>").addClass("twoColumn");
	this.menu.append(this.twoCol);
    },

    finishTwoColumn: function ()
    {
	this.twoCol = null;
	this.menu.append($('<br/>'));
    },

    finishMenu: function()
    {
	this.menu.append($('<br/>'));
	this.addToMenu('Cancel', this.close);
    },

    addToMenu: function (label, action, text, title)
    {
	var row = $("<span></span>").addClass("noWrap");
	if (label)
	{
	    var label;
	    if (action)
	    {
		label = $('<a></a>').attr('href', '').html(label);
		label.click($.proxy(action, this));
	    }
	    else
		label = $('<span></span>').html(label).addClass('problem');
	    row.append(label);
	}
	if (text)
	{
	    if (label)
		text = " &mdash; " + text;
	    row.append($("<span></span>").html(text));
	}
	if (title)
	    row.attr('title', title);
	row.append($('<br></br>'));
	if (this.twoCol)
	{
	    this.twoCol.append(row);
	    if (row.width() > this.colWidth)
	    {
		this.colWidth = row.width();
		this.twoCol.css({ 'width': this.colWidth*2 + 50 });
	    }
	}
	else
	    this.menu.append(row);
    },

    addBuildingToMenu: function (building, label, action)
    {
	var problem = this.district.getBuildingProblem(building, this.index);
	if (problem)
	    this.addToMenu(label || building.name, null, problem, building.toString());
	else
	{
	    if (!action)
		action = function () { this.buildBuilding(building); };
	    var cost = this.district.buildingCost(building);
	    this.addToMenu(label || building.name, action, cost + ' BP', building.toString());
	}
    },

    extend: function ()
    {
	var side = this.district.indexToSide(this.index);
	this.district.extendCity(side);
	var cost = this.district.city.getDistrictCost();
	this.kingdom.spendTreasury(cost);
    },

    selectBorder: function (evt)
    {
	evt.stopPropagation();
	this.openMenu(evt);
	var side = this.district.indexToSide(this.index);
	var existingName = this.district.buildings[this.index] && this.district.buildings[this.index].name;
	$.kingdom.Building.eachBuilding($.proxy(function (building)
	{
	    if (building.size == 'border' && building.name != existingName)
		this.addBuildingToMenu(building);
	}, this));
	if (!this.district.districtTo(side))
	{
	    var cost = this.district.city.getDistrictCost();
	    if (!cost)
		this.addToMenu('Extend City', null, 'must select terrain');
	    else if (cost > this.kingdom.getTreasury())
		this.addToMenu('Extend City', null, 'too expensive (' + cost + ' BP)');
	    else
		this.addToMenu('Extend City', this.extend, cost + ' BP');
	}
	this.finishMenu();
    },

    demolish: function ()
    {
	this.district.clearBuilding(this.index);
    },

    upgrade: function ()
    {
	this.buildBuilding(this.district.buildings[this.index].upgradeTo);
    },

    moveToNorth: function ()
    {
	this.district.move2x1ToEdge(this.index, 0, true);
    },

    moveToSouth: function ()
    {
	this.district.move2x1ToEdge(this.index, 2, true);
    },

    moveToEast: function ()
    {
	this.district.move2x1ToEdge(this.index, 1, true);
    },

    moveToWest: function ()
    {
	this.district.move2x1ToEdge(this.index, 3, true);
    },

    selectBuilding: function (evt)
    {
	this.openMenu(evt);
	if (this.district.canDemolish(this.index))
	    this.addToMenu('Demolish building', this.demolish);
	var currBuilding = this.district.buildings[this.index];
	if (currBuilding.upgradeTo)
	    this.addBuildingToMenu(currBuilding.upgradeTo, 'Upgrade to ' + currBuilding.upgradeTo.name, this.upgrade);
	if (currBuilding.size == '2x1')
	{
	    if (this.district.move2x1ToEdge(this.index, 0, false))
		this.addToMenu('Move building to north edge', this.moveToNorth);
	    if (this.district.move2x1ToEdge(this.index, 2, false))
		this.addToMenu('Move building to south edge', this.moveToSouth);
	    if (this.district.move2x1ToEdge(this.index, 1, false))
		this.addToMenu('Move building to east edge', this.moveToEast);
	    if (this.district.move2x1ToEdge(this.index, 3, false))
		this.addToMenu('Move building to west edge', this.moveToWest);
	}
	this.finishMenu();
    },

    buildBuilding: function (building)
    {
	var cost = this.district.buildingCost(building);
	this.kingdom.spendTreasury(cost);
	this.district.setBuilding(building, this.index);
	if (building.Unrest)
	{
	    var unrest = parseInt(this.kingdom.getChoice("unrest", 0));
	    unrest += building.Unrest;
	    if (unrest < 0)
		unrest = 0;
	    this.kingdom.setChoice("unrest", unrest);
	}
    },

    selectEmptySite: function (evt)
    {
	this.openMenu(evt);
	this.startTwoColumn();
	$.kingdom.Building.eachBuilding($.proxy(function (building)
	{
	    if (building.size != 'border')
		this.addBuildingToMenu(building);
	}, this));
	this.finishTwoColumn();
	this.addToMenu('Cancel', this.close);
    },

    close: function (evt)
    {
	$(document).unbind('click.buildMenu');
	this.menu.hide();
	$(this.target).removeClass("buildingSite");
	this.district = null;
	if (evt)
	    evt.preventDefault();
    }

});

// ====================== Resource class ======================

$.kingdom.Resource = Class.create(
{

    idPrefix: 'resource.',

    statList: ['Economy', 'Loyalty', 'Stability'],

    init: function (kingdom, index)
    {
	this.kingdom = kingdom;
	this.stats = {};
	this.index = index;
	this.description = this.kingdom.getChoice(this.getId('description'), '');
	$.each(this.statList, $.proxy(function (index, name)
	{
	    this.stats[name] = parseInt(this.kingdom.getChoice(this.getId(name), 0));
	}, this));
    },

    getId: function (field)
    {
	field = field || '';
	return this.idPrefix + this.index + '.' + field;
    },

    setDescription: function (newDescription)
    {
	this.kingdom.setChoice(this.getId('description'), newDescription);
	this.description = newDescription;
    },

    setStat: function (statName, strValue)
    {
	var value = parseInt(strValue);
	this.stats[statName] = value;
	this.kingdom.setChoice(this.getId(statName), value);
    },

    getStat: function (statName)
    {
	return this.stats[statName];
    },

    apply: function ()
    {
	$.each(this.statList, $.proxy(function (index, name)
	{
	    if (this.stats[name])
		this.kingdom.modify(name, this.stats[name], "Other");
	}, this));
    },

    renumber: function (newIndex)
    {
	var oldId = this.getId('');
	if (newIndex >= 0)
	{
	    this.index = newIndex;
	    this.kingdom.changeId(oldId, this.getId(''));
	}
	else
	    this.kingdom.changeId(oldId, '', true);
    }

});

// ====================== ResourceTable class ======================

$.kingdom.ResourceTable = Class.create(
{
    resourceCountId: 'resourceCount',

    init: function (kingdom) {
	this.kingdom = kingdom;
	this.resources = [];
	this.resourcesTable = $('.resources tbody');
	this.resourcesTable.empty();
	// load anything stored in kingdom
	var max = parseInt(this.kingdom.getChoice(this.resourceCountId, 0));
	var index;
	for (index = 0; index < max; ++index)
	    this.addResource(index);
	$('#addResourceButton').click($.proxy(this.addResourceHandler, this));
    },

    resetSheet: function ()
    {
	this.resources = [];
	this.resourcesTable.empty();
    },

    addResourceHandler: function (evt)
    {
	this.addResource(this.resources.length, true);
    },

    addCell: function (row, text, editCallback)
    {
	var cell = $('<td></td>');
	if (text)
	    cell.text(text);
	cell.makeEditable($.proxy(editCallback, this));
	row.append(cell);
	return cell;
    },

    addResource: function (index, editNameImmediately)
    {
	var resource = new $.kingdom.Resource(this.kingdom, index);
	this.resources.push(resource);
	var newRow = $('<tr></tr>');
	var descriptionCell = this.addCell(newRow, resource.description, this.finishEditingDescription);
	this.addCell(newRow, resource.getStat('Economy'), this.finishEditingEconomy);
	this.addCell(newRow, resource.getStat('Loyalty'), this.finishEditingLoyalty);
	this.addCell(newRow, resource.getStat('Stability'), this.finishEditingStability);
	this.resourcesTable.append(newRow);
	this.kingdom.setChoice(this.resourceCountId, this.resources.length);
	if (editNameImmediately)
	    descriptionCell.click();
    },

    finishEditingDescription: function (element, newValue, oldValue)
    {
	newValue = newValue.trim();
	var index = $(element).parent().index();
	if (!newValue && oldValue)
	{
	    var answer = confirm("Really delete resource \"" + oldValue + "\"?");
	    if (!answer)
	    {
		element.text(oldValue);
		return;
	    }
	}
	if (!newValue)
	{
	    $(element).parent().remove();
	    this.resources[index].renumber(-1);
	    for (++index; index < this.resources.length; ++index)
	    {
		this.resources[index].renumber(index - 1);
		this.resources[index - 1] = this.resources[index];
	    }
	    this.resources.splice(this.resources.length - 1, 1);
	    this.kingdom.setChoice(this.resourceCountId, this.resources.length);
	}
	else
	    this.resources[index].setDescription(newValue);
    },

    finishEditingStat: function (element, stat, newValue)
    {
	var index = $(element).parent().index();
	this.resources[index].setStat(stat, newValue);
    },

    finishEditingEconomy: function (element, newValue)
    {
	this.finishEditingStat(element, 'Economy', newValue);
    },

    finishEditingLoyalty: function (element, newValue)
    {
	this.finishEditingStat(element, 'Loyalty', newValue);
    },

    finishEditingStability: function (element, newValue)
    {
	this.finishEditingStat(element, 'Stability', newValue);
    },

    apply: function ()
    {
	$.each(this.resources, $.proxy(function (index, resource)
	{
	    resource.apply();
	}, this));
    }

});

// ====================== Initialise! ======================

$(document).ready(function ()
{

    new $.kingdom.KingdomManager();

});
