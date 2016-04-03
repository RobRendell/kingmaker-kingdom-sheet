// ====================== Utility functions ======================

function isTouchDevice() {
    return !!('ontouchstart' in window);
}

// ====================== Changes to global objects ======================
var Class = {
    create: function (settings) {
        var newClass = function () {
            this.init.apply(this, arguments);
        }
        newClass.prototype.init = function () {};
        $.extend(newClass.prototype, settings);
        return newClass;
    }
};

String.prototype.capitalise = function () {
    return this.charAt(0).toUpperCase() + this.substring(1);
};

String.prototype.toId = function () {
    return this.replace(/[^a-zA-Z0-9]/g, '_');
}

String.prototype.intersect = function(other) {
    if (!other || !this)
        return false;
    else
        return (this.indexOf(other) >= 0 || other.indexOf(this) >= 0);
}

String.prototype.toTitleCase = function () {
    return this.replace(/\w\S*/g, function (match) {
        return match.charAt(0).toUpperCase() + match.substr(1).toLowerCase();
    });
}

Number.prototype.plus = function() {
    if (this >= 0)
        return "+" + this.toString();
    else
        return this.toString();
};

Number.prototype.commafy = function () {
    var thisString = this.toString();
    var length = thisString.length;
    var commaChunks = parseInt((length - 1) / 3);
    var leading = length - 3 * commaChunks;
    return thisString.substring(0, leading) + thisString.substring(leading).replace(/(...)/g, ",$1");
};

Number.prototype.numberRange = function () {
    var result = [];
    for (var value = 0; value <= this; ++value)
        result.push(value);
    return result;
};

Array.prototype.joinAnd = function () {
    if (this.length <= 1)
        return this.join("");
    else {
        var lastIndex = this.length - 1;
        return this.slice(0, lastIndex).join(", ") + " and " + this[lastIndex];
    }
};

Array.prototype.shuffle = function () {
    for (var end = this.length; end > 1; ) {
        var from = Math.floor(Math.random() * end);
        --end;
        if (from != end) {
            var swap = this[end];
            this[end] = this[from];
            this[from] = swap;
        }
    }
}

$.fn.editElement = function (callback, inputCallback) {
    var oldValue = $(this).text();
    var input;
    if (inputCallback)
        input = inputCallback(this, oldValue);
    else if ($(this).find("input").length)
        input = false;
    else {
        input = $("<input></input>").val(oldValue);
        input.attr("size", oldValue.length);
    }
    if (!input)
        return;
    $(this).empty();
    $(this).append(input);
    input.focus();
    var parentElt = this;
    $(input).blur(function () {
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
        } else if (evt.which == 9) // tab
        {
            var parent = input.parent();
            var next = (evt.shiftKey) ? parent.prev() : parent.next();
            if (next && $.data(next.get(0), 'events').click) {
                next.trigger("click");
                evt.preventDefault();
            }
        }
    });
    return this;
};

$.fn.makeEditable = function (callback, inputCallback) {
    $(this).click($.proxy(function () {
        $(this).editElement(callback, inputCallback);
    }, this));
    return this;
};

$.fn.setSelect = function (options, keepSelected, newSelectedValue) {
    var select = this;
    var selectedValue = (newSelectedValue) ? newSelectedValue : select.val();
    if (typeof (options) == "number")
        options = options.numberRange();
    else if (!options)
        options = [];
    if (select.is('select')) {
        var value = selectedValue || '';
        select.empty();
        if (keepSelected && options.indexOf(value) < 0)
            select.append($('<option></option>').text(value));
    } else {
        select = $("<select></select>");
        this.empty().append(select);
    }
    $.each(options, $.proxy(function (index, value) {
        var option = $('<option></option>').text(value);
        if (value == selectedValue)
            option.attr('selected', true);
        select.append(option);
    }, this));
    return select;
};

$.kingdom = {};

// ====================== KingdomManager class ======================

$.kingdom.KingdomManager = Class.create({

    init: function () {
        this.data = new $.kingdom.Choices('', 'kingdomManager');
        this.currentName = this.data.get('currentName');
        this.nameList = this.data.getArray('nameList');
        if (this.nameList.length == 0)
            this.nameList = [''];
        this.current = new $.kingdom.Kingdom(this, this.currentName);
        this.setupMenus();
    },

    setupMenus: function () {
        $('#menu').click($.proxy(this.openMenu, this));
        // one-off hooks for the menu
        $('#menuNewKingdom').click($.proxy(this.newKingdom, this));
        $('#menuImportExport').click($.proxy(this.openImportExport, this));
        $('#menuHouseRules').click($.proxy(this.openHouseRules, this));
        // setup handlers for importExportDiv too
        $('#importExportClose').click($.proxy(this.closeImportExport, this));
        $('#importButton').click($.proxy(this.performImport, this));
        // houseRulesDiv likewise
        $('#hrRuleset').change($.proxy(this.updateRulesDivs, this));
        $('#houseRulesClose').click($.proxy(this.closeHouseRules, this));
    },

    updateNameList: function (name) {
        if (this.nameList.indexOf(name) < 0) {
            this.nameList.push(name);
            this.nameList = this.nameList.sort();
            this.data.set('nameList', this.nameList);
        }
    },

    setCurrent: function (current) {
        this.current = current;
        this.currentName = current.name;
        this.data.set('currentName', this.currentName);
        this.updateNameList(this.currentName);
    },

    nameUsed: function (name) {
        return (this.nameList.indexOf(name) >= 0);
    },

    openMenu: function (evt) {
        var kingdomList = $('#kingdomList');
        kingdomList.empty();
        $.each(this.nameList, $.proxy(function (index, name) {
            var link = $('<a></a>');
            link.attr('href', '#');
            link.click($.proxy(function () {
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

    closeMenu: function () {
        $('#menuDiv').hide();
        $(document).unbind('click.mainMenu');
    },

    resetSheet: function () {
        $('*').unbind();
        $('.fromKingdom').text('');
        this.current.resetSheet();
        this.setupMenus();
    },

    switchKingdom: function (name) {
        this.resetSheet();
        this.setCurrent(new $.kingdom.Kingdom(this, name));
    },

    newKingdom: function () {
        if (this.nameUsed(''))
            alert('There is already an unnamed kingdom');
        else
            this.switchKingdom('');
    },

    currentKingdomNameChanged: function () {
        var index = this.nameList.indexOf(this.currentName);
        if (index >= 0)
            this.nameList.splice(index, 1);
        this.setCurrent(this.current);
    },

    deleteCurrentKingdom: function () {
        var index = this.nameList.indexOf(this.currentName);
        if (index >= 0)
            this.nameList.splice(index, 1);
        this.data.set('nameList', this.nameList);
        if (this.nameList.length > 0)
            this.switchKingdom(this.nameList[0]);
        else
            this.newKingdom();
    },

    openImportExport: function () {
        var text = this.current.exportKingdom();
        var overlay = $('#importExportDiv');
        overlay.show();
        overlay.find('textarea').val(text);
    },

    closeImportExport: function () {
        var overlay = $('#importExportDiv');
        overlay.hide();
    },

    performImport: function () {
        var overlay = $('#importExportDiv');
        var importData = overlay.find('textarea').val();
        this.resetSheet();
        this.setCurrent(new $.kingdom.Kingdom(this, undefined, importData));
        overlay.hide();
    },

    openHouseRules: function () {
        $('#houseRulesDiv').show();
        $('#hrRuleset').val(this.current.getChoice('ruleset'));
        this.updateRulesDivs();
        $('#hrMansionVilla').prop('checked', this.current.getBooleanChoice('hrMansionVilla'));
        $('#hrCalculatePrice').prop('checked', this.current.getBooleanChoice('hrCalculatePrice'));
        $('#hrCalculateEconomyBoost').prop('checked', this.current.getBooleanChoice('hrCalculateEconomyBoost'));
    },

    updateRulesDivs: function () {
        if ($('#hrRuleset').val() == 'UC') {
            $('#hrRRROnly').hide();
            $('#hrUCOnly').show();
        } else {
            $('#hrRRROnly').show();
            $('#hrUCOnly').hide();
        }
    },

    houseRulesChanged: function () {
        this.current.setChoice('ruleset', $('#hrRuleset').val());
        this.current.setChoice('hrMansionVilla', $('#hrMansionVilla').is(':checked'));
        this.current.setChoice('hrCalculatePrice', $('#hrCalculatePrice').is(':checked'));
        this.current.setChoice('hrCalculateEconomyBoost', $('#hrCalculateEconomyBoost').is(':checked'));
        this.current.houseRulesBuildings();
    },

    closeHouseRules: function () {
        $('#houseRulesDiv').hide();
        this.houseRulesChanged();
        this.current.renderCities();
        this.current.scheduleRecalculate();
    }

});

// ====================== Choices class ======================

$.kingdom.Choices = Class.create({

    init: function (name, basePrefix) {
        this.basePrefix = basePrefix || 'kingdom.';
        this.name = name || '';
        this.prefix = this.basePrefix + this.name + '.';
        if (!this.supportsLocalStorage()) {
            this.data = {};
            this.isLocalStorage = false;
            alert("Local storage not available in your browser - changes will be lost when you leave.");
        } else {
            this.data = localStorage;
            this.isLocalStorage = true;
        }
    },

    supportsLocalStorage: function () {
        return ('localStorage' in window && window['localStorage'] !== null);
    },

    set: function (name, value) {
        if (value instanceof Array)
            value = value.join("|");
        this.data[this.prefix + name] = value;
        $('input[name="' + name + '"]').val(value);
    },

    get: function (name) {
        return this.data[this.prefix + name];
    },

    getArray: function (name) {
        var result = this.data[this.prefix + name];
        if (result)
            return result.split("|");
        else
            return [];
    },

    clear: function (name) {
        var value = this.data[this.prefix + name];
        if (this.isLocalStorage)
            this.data.removeItem(this.prefix + name);
        else
            delete(this.data[this.prefix + name]);
        return value;
    },

    getKeys: function () {
        if (this.isLocalStorage) {
            var result = [];
            for (var index = 0; index < this.data.length; ++index) {
                var key = this.data.key(index);
                if (key.indexOf(this.prefix) == 0) {
                    key = key.substring(this.prefix.length);
                    result.push(key);
                }
            }
            return result;
        } else
            return Object.keys(this.data);
    },

    changeId: function (oldId, newId, remove) {
        var keys = this.getKeys();
        $.each(keys, $.proxy(function (index, key) {
            if (key.indexOf(oldId) == 0) {
                var value = this.clear(key)
                if (!remove) {
                    var newKey = newId + key.substring(oldId.length);
                    this.set(newKey, value);
                }
            }
        }, this));
    },

    setName: function (name) {
        name = name || '';
        var oldPrefix = this.name.toId() + '.';
        var newPrefix = name.toId() + '.';
        this.prefix = this.basePrefix;
        this.changeId(oldPrefix, newPrefix, false);
        this.name = name;
        this.prefix = this.basePrefix + this.name + '.';
    },

    removeName: function () {
        var oldPrefix = this.name.toId() + '.';
        this.prefix = this.basePrefix;
        this.changeId(oldPrefix, '', true);
    }

});

// ====================== Kingdom class ======================

$.kingdom.Kingdom = Class.create({

    emptyNameString: '<Enter name here>',

    init: function (kingdomManager, name, importData) {
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
        $('input[type="text"]').each($.proxy(function (index, input) {
            var field = $(input).attr('name');
            $(input).val(this.choices.get(field));
            $(input).change($.proxy(this.inputChanged, this));
        }, this));
        this.setupSelect('roads', 'size');
        this.setupSelect('farms', 'roads');
        // SelectAffect instances
        this.alignment = new $.kingdom.SelectAffect(this, 'Alignment', null, {
            'Lawful Good': {
                'Economy': 2,
                'Loyalty': 2
            },
            'Neutral Good': {
                'Stability': 2,
                'Loyalty': 2
            },
            'Chaotic Good': {
                'Loyalty': 4
            },
            'Lawful Neutral': {
                'Economy': 2,
                'Stability': 2
            },
            'True Neutral': {
                'Stability': 4
            },
            'Chaotic Neutral': {
                'Loyalty': 2,
                'Stability': 2
            },
            'Lawful Evil': {
                'Economy': 4
            },
            'Neutral Evil': {
                'Stability': 2,
                'Economy': 2
            },
            'Chaotic Evil': {
                'Loyalty': 2,
                'Economy': 2
            }
        });
        this.promotions = new $.kingdom.SelectAffect(this, 'Promotions', 'Edicts', {
            'None': {
                'Stability': -1
            },
            'Token': {
                'Stability': 1,
                'Consumption': 1
            },
            'Standard': {
                'Stability': 2,
                'Consumption': 2
            },
            'Aggressive': {
                'Stability': 3,
                'Consumption': 4
            },
            'Expansionist': {
                'Stability': 4,
                'Consumption': 8
            }
        }, 'PromotionsFactor', 'Consumption');
        this.taxation = new $.kingdom.SelectAffect(this, 'Taxation', 'Edicts', {
            'None': {
                'Loyalty': 1
            },
            'Light': {
                'Economy': 1,
                'Loyalty': -1
            },
            'Normal': {
                'Economy': 2,
                'Loyalty': -2
            },
            'Heavy': {
                'Economy': 3,
                'Loyalty': -4
            },
            'Overwhelming': {
                'Economy': 4,
                'Loyalty': -8
            }
        }, 'TaxationFactor', 'Loyalty');
        this.festivals = new $.kingdom.SelectAffect(this, 'Festivals', 'Edicts', {
            'None': {
                'Loyalty': -1
            },
            '1 per year': {
                'Loyalty': 1,
                'Consumption': 1
            },
            '6 per year': {
                'Loyalty': 2,
                'Consumption': 2
            },
            '12 per year': {
                'Loyalty': 3,
                'Consumption': 4
            },
            '23 per year': {
                'Loyalty': 4,
                'Consumption': 8
            }
        }, 'FestivalsFactor', 'Consumption');
        this.limitsTable = new $.kingdom.LimitsTable(this);
        this.peopleTable = new $.kingdom.PeopleTable(this);
        this.leaderTable = new $.kingdom.LeaderTable(this, this.peopleTable);
        this.resourceTable = new $.kingdom.ResourceTable(this);
	this.armyTable = new $.kingdom.ArmyTable(this);
        // load appropriate rules
        this.houseRulesBuildings();
        // load cities
        this.magicItemSource = new $.kingdom.MagicItemSource();
        var cityNames = this.getArrayChoice('cityNames');
        this.cities = {};
        $.each(cityNames, $.proxy(function (index, cityName) {
            var city = new $.kingdom.City(this, cityName);
            this.cities[cityName] = city;
        }, this));
        this.renderCities();
        this.cityBuilder = new $.kingdom.CityBuilder(this);
        // Handle buttons
        $('#fillItemSlots').click($.proxy(function () {
            $.each(this.cities, $.proxy(function (cityName) {
                var city = this.cities[cityName];
                city.fillItemSlots();
            }, this));
        }, this));
        $('#improveCitiesButton').click($.proxy(function () {
            var buildings = this.getChoice('improveCitiesBuildings');
            var treasuryLimit = parseInt(this.getChoice('improveCitiesTreasuryLimit'));
            this.improveCities(buildings, treasuryLimit);
        }, this));
        $('#emptyItemSlots').click($.proxy(function () {
            var count = 0;
            $.each(this.cities, $.proxy(function (cityName) {
                var city = this.cities[cityName];
                count += city.emptyCheapItemSlots();
            }, this));
            $('#valuableItemOutput').append($('<div/>').text('Emptied ' + count + ' slots.'));
        }, this));
        $('#sellItemSlots').click($.proxy(function () {
            var numDistricts = 0;
            $.each(this.cities, function (cityName, city) {
                numDistricts += city.districts.length;
            });
            var slotsLeft = this.sellItemSlots('major', numDistricts, $('#valuableItemOutput'));
            slotsLeft = this.sellItemSlots('medium', slotsLeft, $('#valuableItemOutput'));
            slotsLeft = this.sellItemSlots('minor', slotsLeft, $('#valuableItemOutput'));
            if (slotsLeft == numDistricts) {
                $('#valuableItemOutput').append($('<div/>').text('No items to sell.'));
            }
        }, this));
        $('#addCityButton').click($.proxy(function () {
            new $.kingdom.City(this);
        }, this));
        // Initialise expandos
        this.setupExpandos();
        // Initial calculate
        this.scheduleRecalculate();
        this.calendar = new $.kingdom.Calendar(this);
    },

    renderCities: function () {
        $.each(this.cities, function (name, city) {
            city.render();
        });
    },

    reset: function () {
        $.each(Object.keys(this.data), $.proxy(function (index, field) {
            this.set(field, 0);
        }, this));
    },

    newTurn: function () {
        $('.output').text('');
        this.setChoice('buildsThisTurn', 0);
        this.setChoice('extraHouse', true);
    },

    resetSheet: function () {
        this.peopleTable.resetSheet();
        this.resourceTable.resetSheet();
        this.armyTable.resetSheet();
        this.cityNames = [];
        this.cities = {};
        $("#citiesDiv").empty();
    },

    get: function (field, defaultValue) {
        if (this.data[field] === undefined)
            return defaultValue;
        else
            return this.data[field];
    },

    set: function (field, value) {
        this.data[field] = value;
        this.refreshKingdomField(field);
    },

    modify: function (field, amount) {
        if (!this.data[field]) {
            this.data[field] = 0;
            this.data[field + '_Plus'] = 0;
            this.data[field + '_Minus'] = 0;
        }
        this.data[field] += amount;
        if (amount > 0) {
            this.data[field + '_Plus'] += amount;
            this.refreshKingdomField(field + '_Plus');
        } else {
            this.data[field + '_Minus'] += amount;
            this.refreshKingdomField(field + '_Minus');
        }
        for (var index = 2; index < arguments.length; index++) {
            var reason = arguments[index];
            this.modify(reason + '_' + field, amount);
        }
        this.refreshKingdomField(field);
    },

    refreshKingdomField: function (field) {
        var element = $('.fromKingdom.' + field);
        var value = this.data[field];
        if (element.is('.plusNumber'))
            value = value.plus();
        else if (value && element.is('.number'))
            value = value.commafy();
        if (!value) {
            if (element.is('.number'))
                value = 0;
            else
                value = '&nbsp;';
        }
        $(element).html(value);
    },

    editKingdomName: function (element, newValue, oldValue) {
        newValue = newValue.trim();
        if (oldValue == this.emptyNameString)
            oldValue = '';
        if (newValue == this.emptyNameString)
            newValue = '';
        if (!newValue && oldValue) {
            var answer = confirm("Really delete " + oldValue + "?");
            if (!answer) {
                element.text(oldValue);
                return;
            }
            this.choices.removeName();
            this.kingdomManager.deleteCurrentKingdom();
            return;
        } else if (newValue && newValue != oldValue && this.kingdomManager.nameUsed(newValue)) {
            alert('There is already a kingdom named ' + newValue);
            element.text(oldValue || this.emptyNameString);
            return;
        }
        element.text(newValue || this.emptyNameString);
        this.choices.setName(newValue.toId());
        this.name = newValue;
        this.kingdomManager.currentKingdomNameChanged(newValue);
    },

    setChoice: function (field, value) {
        this.choices.set(field, value);
        this.scheduleRecalculate();
    },

    changeChoice: function (field, value, defaultValue) {
        var oldValue = this.getChoice(field, defaultValue);
        if (oldValue != value) {
            this.setChoice(field, value);
            $('[name="' + field + '"]').val(value);
        }
    },

    clearChoice: function (field) {
        this.scheduleRecalculate();
        return this.choices.clear(field);
    },

    getChoice: function (field, defaultValue) {
        if (this.choices.get(field) == undefined)
            return defaultValue;
        else
            return this.choices.get(field);
    },

    getArrayChoice: function (field, defaultValue) {
        if (this.choices.get(field) == undefined)
            return defaultValue || [];
        else
            return this.choices.getArray(field);
    },

    getBooleanChoice: function (field) {
        return (this.getChoice(field) == 'true');
    },

    changeId: function (oldId, newId, remove) {
        this.choices.changeId(oldId, newId, remove);
    },

    setupSelect: function (selectName, valueField) {
        var select = $('[name="' + selectName + '"]');
        var max = parseInt(this.choices.get(valueField));
        var current = parseInt(this.choices.get(selectName));
        select.setSelect(max);
        select.val(current);
        select.change($.proxy(this.inputChanged, this));
    },

    getTreasury: function () {
        return parseInt(this.getChoice("treasury", 0));
    },

    spendTreasury: function (amount) {
        this.setChoice("treasury", this.getTreasury() - amount);
    },

    inputChanged: function (evt) {
        var field = $(evt.target).attr('name');
        var value = $(evt.target).val();
        this.setChoice(field, value);
    },

    scheduleRecalculate: function () {
        if (!this.recalculateCallout)
            this.recalculateCallout = window.setTimeout($.proxy(this.recalculate, this), 10);
    },

    getType: function () {
        var size = this.getChoice('size', 0);
        if (size <= 20)
            return "Barony";
        else if (size <= 80)
            return "Dutchy";
        else
            return "Kingdom";
    },

    applyCities: function () {
        $.each(this.cities, $.proxy(function (index, city) {
            city.apply();
        }, this));
    },

    apply: function () {
        this.modify("UnrestRate", 0);
        var unrest = this.getChoice("unrest", 0);
        this.modify("Unrest", unrest);
        this.modify("Economy", -unrest, "Unrest");
        this.modify("Loyalty", -unrest, "Unrest");
        this.modify("Stability", -unrest, "Unrest");

        var size = parseInt(this.getChoice('size', 0));
        this.modify("ControlDC", size + 20);
        this.modify("Population", size * 250, "Rural");
        this.modify("Population", 0, "City");
        this.modify("Consumption", size, "Size");
        $("#kingdomType").text(this.getType());

        $('[name="roads"]').setSelect(size);
        var roads = parseInt(this.getChoice("roads", 0));
        if (roads > size) {
            this.setChoice("roads", size);
            roads = size;
        }
        this.modify("Economy", parseInt(roads / 4), "Roads");
        this.modify("Stability", parseInt(roads / 8), "Roads");

        $('[name="farms"]').setSelect(roads);
        if (farms > roads) {
            this.setChoice("farms", roads);
            farms = roads;
        }
        var farms = parseInt(this.getChoice("farms", 0));
        var farmsProduction = 2 * farms;
        var consumption = this.get("Consumption");
        if (farmsProduction > consumption) {
            this.set("Consumption_Actual", "(" + (farmsProduction - consumption) + " farm production surplus)");
            farmsProduction = consumption;
        }
        this.modify("Consumption", -farmsProduction, "Farms");

        this.limitsTable.refresh();
        this.set('limitBuildingsCurrent', parseInt(this.get('limitBuildings')) - parseInt(this.getChoice('buildsThisTurn')));
        this.setExtraHouse();

    },

    setExtraHouse: function (extraHouse) {
        if (extraHouse !== undefined) {
            this.setChoice('extraHouse', extraHouse);
        }
        this.set('extraHouse', (this.getChoice('extraHouse') == 'true') ? ' (+ 1 house)' : '');
    },

    recalculate: function () {
        this.recalculateCallout = null;

        // console.info("recalculating...");
        this.reset();

        // cities
        this.applyCities();

        // alignment modifiers
        this.alignment.apply();

        // edicts
        this.promotions.apply();
        this.taxation.apply();
        this.festivals.apply();

    	// armies
        this.armyTable.apply();

        // global factors
        this.apply();

        // other resources
        this.resourceTable.apply();

        this.leaderTable.apply();
    },

    exportKingdom: function () {
        var text = 'Name:' + (this.name || '') + '\n';
        $.each(this.choices.getKeys(), $.proxy(function (index, key) {
            text += key;
            text += ':';
            text += this.choices.get(key);
            text += '\n';
        }, this));
        return text;
    },

    importKingdom: function (text) {
        var name;
        this.choices = undefined;
        $.each(text.split(/[\r\n]/), $.proxy(function (index, line) {
            var colonPos = line.indexOf(':');
            var key = line.substring(0, colonPos);
            var value = line.substring(colonPos + 1);
            if (key == 'Name') {
                name = value;
                this.choices = new $.kingdom.Choices(name);
            } else if (key)
                this.setChoice(key, value);
        }, this));
        return name;
    },

    setupExpandos: function () {
        $('.expando').each(function (index, element) {
            var target = $(element).parent().next();
            if ($(element).text() == '[+]')
                $(target).hide();
            $(element).click(function () {
                $(target).toggle("fast", function () {
                    if ($(target).is(":visible"))
                        $(element).text("[-]");
                    else
                        $(element).text("[+]");
                });
            });
        });
    },

    sellItemSlots: function (type, count, element) {
        // Find all slots containing items of the given type (starting with the highest slots)
        var citiesAndSlots = [];
        $.each(this.cities, $.proxy(function (cityName, city) {
            citiesAndSlots = citiesAndSlots.concat(city.findItemSlotsWithItemsOfType(type));
        }, this));
        // Attempt to sell at most count of them
        var itemTypes = [ 'major', 'medium', 'minor' ];
        var itemSellDCs = [ 50, 35, 20 ];
        var itemSellBPs = [ 15, 8, 2 ];
        for (var index = 0; index < citiesAndSlots.length && count > 0; ++index, --count) {
            var city = citiesAndSlots[index].city;
            var slotType = citiesAndSlots[index].slotType;
            var itemType = citiesAndSlots[index].itemType;
            var slot = citiesAndSlots[index].slot;
            var itemTypeIndex = itemTypes.indexOf(itemType);
            var dc = itemSellDCs[itemTypeIndex];
            var roll = parseInt(Math.random()*20) + 1;
            var total = (roll > 1) ? roll + this.get('Economy') : 0;
            if (total >= dc) {
                var bp = itemSellBPs[itemTypeIndex];
                this.spendTreasury(-bp);
                element.append($('<div/>').text(`Successfully sold ${type} item "${city.itemSlots[slotType][slot].name}" in ${city.name} for ${bp} BPs, rolled ${roll} for total ${total} vs DC ${dc}.`).addClass('successfulSale'));
                city.itemSlots[slotType][slot] = null;
                city.refreshItemSlots();
                city.save();
            } else if (roll == 1) {
                element.append($('<div/>').text(`Failed to sell ${type} item "${city.itemSlots[slotType][slot].name}" in ${city.name}, rolled natural 1.`).addClass('problem'));
            } else {
                element.append($('<div/>').text(`Failed to sell ${type} item "${city.itemSlots[slotType][slot].name}" in ${city.name}, rolled ${roll} for total ${total} vs DC ${dc}.`).addClass('problem'));
            }
        }
        return count;
    },

    improveCities: function (buildingsString, treasuryLimit) {
        var buildingNames = buildingsString.split(/, */);
        var buildings = [];
        for (var index = 0; index < buildingNames.length; ++index) {
            var name = buildingNames[index].toTitleCase();
            if ($.kingdom.Building.buildingData[name]) {
                buildings.push($.kingdom.Building.get(name));
            } else {
                $('#improveCitiesOutput').append($('<div/>').text('Building name "' + name + '" unknown - skipping.').addClass('problem'));
            }
        }
        var buildingLimit = parseInt(this.get('limitBuildings')) - parseInt(this.getChoice('buildsThisTurn'));
        var cityNames = Object.keys(this.cities);
        var extraHouse = this.getChoice('extraHouse');
        var userBuildings = true;
        var goal;
        while (buildingLimit > 0 && this.getTreasury() > treasuryLimit && cityNames.length > 0) {
            var cityIndex = parseInt(Math.random() * cityNames.length)
            var city = this.cities[cityNames[cityIndex]];
            var numBuilt = city.automatedImprovement(buildings, treasuryLimit, buildingLimit, extraHouse, !userBuildings);
            if (!numBuilt) {
                cityNames.splice(cityIndex, 1);
            } else if (extraHouse && (numBuilt > 1 || buildingLimit == 0)) {
                extraHouse = false;
                buildingLimit -= numBuilt - 1;
            } else {
                buildingLimit -= numBuilt;
            }
            if (cityNames.length == 0 && userBuildings) {
                userBuildings = false;
                cityNames = Object.keys(this.cities);
            }
            if (!userBuildings) {
                var newGoal = this.determineImproveCitiesGoal();
                if (newGoal != goal) {
                    goal = newGoal;
                    buildings = this.getBuildingsForGoal(goal);
                }
            }
        }
        this.setChoice('buildsThisTurn', parseInt(this.get('limitBuildings')) - buildingLimit);
        this.setExtraHouse(extraHouse);
        $('#improveCitiesOutput').append($('<div/>').text('=== Finished automatically building improvements.'));
    },

    determineImproveCitiesGoal: function () {
        var target = parseInt(this.get('ControlDC')) + parseInt(this.getChoice('improveCitiesMargin'));
        var loyalty = this.get('Loyalty');
        var stability = this.get('Stability');
        if (loyalty < target) {
            if (stability < target) {
                return (loyalty < stability) ? 'Loyalty' : 'Stability';
            } else {
                return 'Loyalty';
            }
        } else if (stability < target) {
            return 'Stability';
        } else {
            return 'Economy';
        }
    },

    getBuildingsForGoal: function (goal) {
        if (!this.goalBuildings) {
            this.goalBuildings = {};
        }
        if (!this.goalBuildings[goal]) {
            this.goalBuildings[goal] = [];
            $.kingdom.Building.eachBuilding($.proxy(function (building) {
                if (building.getSize() != '1x1' || !building.getData()[goal]) {
                    return;
                }
                var cost = building.getCost();
                var idealCost = this.calculateIdealCost(building.getData());
                if (cost <= idealCost * 1.1) {
                    if (cost < idealCost * 0.9) {
                        // double chance for good-value buildings
                        this.goalBuildings[goal].push(building);
                    }
                    this.goalBuildings[goal].push(building);
                }
            }, this));
        }
        return this.goalBuildings[goal];
    },

    setRiversRunRedData: function () {
        $.kingdom.Building.buildingData = {
            'continue': {},
            'Academy': {
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
                'cost': 6,
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
                'halveCost': ["Temple", "Academy"],
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
                'borderColour': 'tan',
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
                'cost': 12,
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
        };
    },

    setUltimateCampaignData: function () {
        $.kingdom.Building.buildingData = {
            'continue': {},
            'Academy': {
                'size': '2x1',
                'cost': 52,
                'halveCost': ["Caster's Tower", "Library", "Magic Shop"],
                'upgradeTo': "University",
                'minorItems': 3, // TODO: scrolls or wondrous items only
                'mediumItems': 2, // TODO: scrolls or wondrous items only
                'Economy': 2,
                'Loyalty': 2,
                'lore': {'default': 2, 'Nominated Knowledge or Profession skill': 2 }, // TODO: Nominate 1 knowledge or profession skill that gets another +2
                'productivity': 1,
                'society': 2
            },
            'Alchemist': {
                'size': '1x1',
                'cost': 18,
                'adjacentHouses': 1,
                'cityValue': 1000,
                'minorItems': 1, // TODO: potion or wondrous item only
                'Economy': 1
            },
            'Arena': {
                'size': '2x2',
                'cost': 40,
                'halveCost': ["Dance Hall", "Garrison", "Inn", "Stable", "Theater"],
                'halveKingdom': 'Festivals',
                'Stability': 4,
                'onePerCity': true,
                'Fame': 1, // TODO
                'crime': 1
            },
            'Bank': {
                'size': '1x1', // TODO image required
                'cost': 28,
                'Economy': 4,
                'cityValue': 2000
            },
            'Bardic College': {
                'size': '2x1', // TODO image required
                'cost': 40,
                'halveCost': ["Library", "Museum", "Theater"],
                'minorItems': 2, // TODO: scrolls or wondrous items only
                'Economy': 1,
                'Loyalty': 3,
                'Stability': 1,
                'Fame': 1 // TODO
            },
            'Barracks': {
                'size': '1x1',
                'cost': 6,
                'upgradeTo': 'Garrison',
                'Defense': 2,
                'Unrest': -1,
                'law': 1
            },
            'Black Market': {
                'size': '1x1',
                'cost': 50,
                'halveCost': ["Dance Hall"],
                'adjacentHouses': 2,
                'cityValue': 2000,
                'minorItems': 2,
                'mediumItems': 1,
                'majorItems': 1,
                'Economy': 2,
                'Stability': 1,
                'Unrest': 1,
                'corruption': 2,
                'crime': 2
            },
            'Brewery': {
                'size': '1x1',
                'cost': 6,
                'Loyalty': 1,
                'Stability': 1
            },
            'Bridge': {
                'size': '1x1', // TODO image required
                'cost': 6,
                'Economy': 1
                // TODO replaces/shares with Waterway
            },
            'Bureau': {
                'size': '2x1', // TODO image required
                'cost': 10,
                'Economy': 1,
                'Loyalty': -1,
                'Stability': 1,
                'corruption': 1,
                'law': 1
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
                'onePerCity': true,
                'Fame': 1 // TODO
            },
            'Cathedral': {
                'size': '2x2',
                'cost': 58,
                'halveCost': ["Temple", "Academy"],
                'halveKingdom': 'Promotions',
                'minorItems': 3, // TODO potions or wondrous items
                'mediumItems': 2, // TODO potions or wondrous items
                'Loyalty': 4,
                'Stability': 4,
                'Unrest': -4,
                'onePerCity': true,
                'Fame': 1, // TODO
                'law': 2
            },
            'Cistern': {
                'size': '1x1', // TODO image required
                'cost': 6,
                'Stability': 1
                // TODO may not be adjacent to a Dump, Graveyard, Stable, Stockyard or Tannery
                // TODO can share a lot with another building :(
            },
            'City Wall': {
                'size': 'border',
                'borderColour': '#666666',
                'borderZ': 3,
                'cost': 2,
                'Defense': 1,
                'Unrest': -2 // TODO once per settlement only
            },
            'Dance Hall': {
                'size': '1x1',
                'image': 'Brothel',
                'cost': 4,
                'adjacentHouses': 1,
                'Economy': 1,
                'Loyalty': 2,
                'Unrest': 1,
                'corruption': 1,
                'crime': 1
            },
            'Dump': {
                'size': '1x1',
                'cost': 4,
                'Stability': 1
                // TODO may not be adjacent to a House, Mansion or Noble Villa
            },
            'Everflowing Spring': {
                'cost': 5
                // TODO requires at least 1 medium magic item slot
                // TODO shares a lot with Castle, Cathedral, Market, Monument, Park or Town Hall
            },
            'Exotic Artisan': {
                'size': '1x1',
                'image': 'Exotic Craftsman',
                'cost': 10,
                'adjacentHouses': 1,
                'minorItems': 1, // TODO ring, wand or wondrous item
                'Economy': 1,
                'Stability': 1
            },
            'Foreign Quarter': {
                'size': '2x2', // TODO image required
                'cost': 30,
                'Economy': 3,
                'Stability': -1,
                'crime': 1,
                'lore': {'default': 1},
                'society': 2
                // TODO increases value of trade routes by 5% to a maximum of 100%
            },
            'Foundry': {
                'size': '2x1', // TODO image required
                'cost': 16,
                'Economy': 1,
                'Stability': 1,
                'Unrest': 1,
                'halveCost': ["Blacksmith"],
                'adjacentWater': true,
                'productivity': 1
                // TODO increase the Economy and BP-per-turn from a connected mine :(
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
                // TODO if Consumption is < 0, store up to 5 BP to use to pay later Consumption
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
                'halveCost': ["Pier", "Stable", "Trade Shop"],
                'Economy': 2,
                'Loyalty': 2,
                'law': 1,
                'productivity': 2
            },
            'Herbalist': {
                'size': '1x1',
                'cost': 10,
                'adjacentHouses': 1,
                'minorItems': 1, // TODO potion or wondrous item
                'Loyalty': 1,
                'Stability': 1
            },
            'Hospital': {
                'size': '2x1', // TODO image required
                'cost': 30,
                'Loyalty': 1,
                'Stability': 2,
                'lore': {'default': 1},
                'productivity': 2
                // TODO Increase Stability by 2 during plague events
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
                'Loyalty': 1,
                'society': 1
            },
            'Jail': {
                'size': '1x1',
                'cost': 14,
                'Loyalty': 2,
                'Stability': 2,
                'Unrest': -2,
                'crime': -1,
                'law': 1
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
                'Loyalty': 1,
                'upgradeTo': 'Academy',
                'lore': {'default': 1}
            },
            'Luxury Store': {
                'size': '1x1',
                'cost': 28,
                'adjacentHouses': 1,
                'upgradeTo': 'Magic Shop',
                'cityValue': 2000,
                'minorItems': 2, // TODO rings, wands or wondrous items
                'Economy': 1
            },
            'Magic Shop': {
                'size': '1x1',
                'cost': 68,
                'adjacentHouses': 2,
                'cityValue': 2000,
                'minorItems': 4, // TODO wondrous items
                'mediumItems': 2, // TODO wondrous items
                'majorItems': 1, // TODO wondrous items
                'Economy': 1
            },
            'Magical Academy': {
                'size': '2x1', // TODO image required
                'cost': 58,
                'Economy': 2,
                'Fame': 1, // TODO
                'halveCost': ["Caster's Tower", "Library", "Magic Shop"],
                'minorItems': 3, // TODO potions, scrolls or wondrous items
                'mediumItems': 1, // TODO potions, scrolls or wondrous items
                'lore': {'default': 2, 'Knowledge (Arcana)': 2},
                'society': 1
            },
            'Magical Streetlamps': {
                // TODO can share a lot with building or improvement
                'cost': 5,
                // TODO Settlement must have a Cathedral, Magic Shop, Magical Academy or Temple
                'crime': -1
            },
            'Mansion': {
                'size': '1x1',
                'cost': 10,
                'Stability': 1,
                'upgradeTo': 'Noble Villa',
                'law': 1,
                'society': 1
            },
            'Market': {
                'size': '2x1',
                'cost': 48,
                'adjacentHouses': 2,
                'cityValue': 2000,
                'halveCost': ["Black Market", "Inn", "Shop"],
                'minorItems': 2, // TODO wondrous items
                'Economy': 2,
                'Stability': 2
            },
            'Menagerie': {
                'size': '2x2', // TODO image required
                'cost': 16,
                'Economy': 1,
                'Loyalty': 0, // TODO 1/4 the CR of the highest CR creature on display
                'Fame': 1
            },
            'Military Academy': {
                'size': '2x1', // TODO image required
                'cost': 36,
                'Loyalty': 2,
                'Stability': 2,
                'Fame': 1, // TODO
                'halveCost': ["Barracks"],
                'onePerCity': true,
                // TODO Armies and commanders recruited in city gain one bonus tactic
                'minorItems': 1, // TODO armor, shield or weapon
                'mediumItems': 1, // TODO armor, shield or weapon
                'law': 1,
                'lore': {'default': 1}
            },
            'Mill': {
                'size': '1x1',
                'cost': 6,
                'adjacentWater': true,
                'Economy': 1,
                'Stability': 1,
                'productivity': 1
                // TODO Windmill with GM approval can ignore water border limit
            },
            'Mint': {
                'size': '1x1', // TODO image required
                'cost': 30,
                'Economy': 3,
                'Loyalty': 3,
                'Stability': 1,
                'Fame': 1 // TODO
            },
            'Moat': {
                'size': 'border',
                'borderColour': '#000', // TODO colour required
                'borderZ': 3,
                'cost': 2,
                'Defense': 1,
                'Unrest': -1 // TODO once per settlement only
            },
            'Monastery': {
                'size': '2x1', // TODO image required
                'cost': 16,
                'Stability': 1,
                'law': 1,
                'lore': {'default': 1}
            },
            'Monument': {
                'size': '1x1',
                'cost': 6,
                'Loyalty': 1,
                'Unrest': -1
            },
            'Museum': {
                'size': '2x1', // TODO image required
                'cost': 30,
                'Economy': 1,
                'Loyalty': 1,
                'Fame': 1, // TODO optional +1 per 10,000 gp of most valuable item (max +5), +1 more if significant to kingdom
                'lore': {'default': 2, 'Knowledge (History)': 2, 'Appraise checks regarding art objects': 0},
                'society': 1
            },
            'Noble Villa': {
                'size': '2x1',
                'cost': 24,
                'halveCost': ["Exotic Artisan", "Luxury Store", "Mansion"],
                'Economy': 1,
                'Loyalty': 1,
                'Stability': 1,
                'Fame': 1, // TODO
                'society': 1
            },
            'Observatory': {
                'size': '1x1', // TODO image required
                'cost': 12,
                'Stability': 1,
                'minorItems': 1, // TODO scroll or wondrous item
                'lore': {'default': 2}
            },
            'Orphanage': {
                'size': '1x1', // TODO image required
                'cost': 6,
                'Stability': 1,
                'Unrest': -1
            },
            'Palace': {
                'size': '2x2', // TODO image required
                'cost': 108,
                'Economy': 2,
                'Loyalty': 6,
                'Stability': 2,
                'Fame': 1, // TODO
                'halveCost': ["Mansion", "Mint", "Noble Villa"],
                'cityValue': 1000,
                'law': 2
                // TODO may make two special edicts per turn but take -2 on checks for each
            },
            'Park': {
                'size': '1x1',
                'cost': 4,
                'Loyalty': 1,
                'Unrest': -1
            },
            'Paved Streets': {
                'size': 'district', // TODO per-district
                'cost': 24,
                'Economy': 2,
                'Stability': 1,
                'productivity': 2
            },
            'Pier': {
                'size': '1x1',
                'cost': 16,
                'adjacentWater': true,
                'cityValue': 1000,
                'upgradeTo': 'Waterfront',
                'Economy': 1,
                'Stability': 1,
                'crime': 1
            },
            'Sewer System': {
                'size': 'district', // TODO per-district
                'cost': 24,
                'Loyalty': 1,
                'Stability': 2,
                'halveCost': ["Cistern", "Dump"],
                'crime': 1,
                'productivity': 1
            },
            'Shop': {
                'size': '1x1',
                'cost': 8,
                'adjacentHouses': 1, // TODO also Mansion
                'cityValue': 500,
                'upgradeTo': ["Luxury Store", "Market"],
                'Economy': 1,
                'productivity': 1
            },
            'Shrine': {
                'size': '1x1',
                'cost': 8,
                'minorItems': 1, // TODO potion, scroll, wondrous item
                'upgradeTo': 'Temple',
                'Loyalty': 1,
                'Unrest': -1
            },
            'Smithy': {
                'size': '1x1',
                'image': 'Smith',
                'cost': 6,
                'Economy': 1,
                'Stability': 1
            },
            'Stable': {
                'size': '1x1',
                'cost': 10,
                'Economy': 1,
                'Loyalty': 1,
                'adjacentHouses': 1, // also Mansion or Noble Villa
                'cityValue': 500
            },
            'Stockyard': {
                'size': '2x2', // TODO image required
                'cost': 20,
                'Economy': 1,
                'Stability': -1,
                'halveCost': ["Stable", "Tannery"],
                'productivity': 1
                // TODO Farms in this or adjacent hexes reduce Consumption by 3 instead of 2
            },
            'Tannery': {
                'size': '1x1',
                'cost': 6,
                'Economy': 1,
                'Stability': 1,
                'noAdjacentHouses': true, // includes Mansions and Noble Villas
                'society': -1
            },
            'Tavern': {
                'size': '1x1',
                'cost': 12,
                'Economy': 1,
                'Loyalty': 1,
                'adjacentHouses': 1,
                'cityValue': 500,
                'corruption': 1
            },
            'Temple': {
                'size': '2x1',
                'cost': 32,
                'Loyalty': 2,
                'Stability': 2,
                'Unrest': -2,
                'halveCost': ["Graveyard", "Monument", "Shrine"],
                'minorItems': 2
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
                'Economy': 2,
                'Stability': 2,
                'halveCost': ["Dance Hall", "Exotic Artisan", "Inn", "Park", "Tavern"],
                'upgradeTo': "Arena"
            },
            'Town Hall': {
                'size': '2x1',
                'cost': 22,
                'Economy': 1,
                'Loyalty': 1,
                'Stability': 1,
                'halveCost': ["Barracks", "Cistern", "Dump", "Jail", "Watchtower"],
                'law': 1
            },
            'Trade Shop': {
                'size': '1x1',
                'image': 'Tradesman',
                'cost': 10,
                'Economy': 1,
                'Stability': 1,
                'adjacentHouses': 1,
                'upgradeTo': "Guildhall",
                'cityValue': 500,
                'productivity': 1
            },
            'University': {
                'size': '2x2',
                'cost': 78,
                'Economy': 3,
                'Loyalty': 3,
                'Fame': 1, // TODO
                'halveCost': ["Academy", "Bardic College", "Library", "Magical Academy", "Military Academy", "Museum"],
                'minorItems': 4, // TODO scrolls or wondrous items
                'mediumItems': 2, // TODO scrolls or wondrous items
                'lore': {'default': 4, 'Nominated Knowledge or Profession skill': 4}, // TODO +4 more to a nomninated Knowledge or Profession skill
                'society': 3
            },
            'Watchtower': {
                'size': '1x1',
                'cost': 12,
                'Stability': 1,
                'Defense': 2,
                'Unrest': -1
            },
            'Watergate': {
                // TODO shares city wall :(
                'cost': 2,
                'extraBuild': 1
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
                'Economy': 4,
                'halveCost': ["Black Market", "Guildhall", "Market", "Pier"],
                'adjacentWater': true,
                'onePerCity': true,
                'cityValue': 4000,
                'halveKingdom': 'Taxation',
                'minorItems': 2, // TODO wondrous items
                'mediumItems': 1, // TODO wondrous items
                'majorItems': 1, // TODO wondrous items
                'productivity': 2
            },
            'Waterway': {
                'size': '1x1', // TODO image required, can be 2x1 if you want :-P
                'cost': 3
                // TODO counts as a water border for adjacent houses
            }
        };
    },

    houseRulesBuildings: function () {
        if (this.getChoice('ruleset') == 'UC')
            this.setUltimateCampaignData();
        else
            this.setRiversRunRedData();
        if (this.getBooleanChoice('hrMansionVilla')) {
            console.info('Mansions and Noble Villas are houses');
            $.kingdom.Building.buildingData['Mansion'].isHouse = true;
            $.kingdom.Building.buildingData['Noble Villa'].isHouse = true;
        }
        var calculate = this.getBooleanChoice('hrCalculatePrice')
        var economyBoost = this.getBooleanChoice('hrCalculateEconomyBoost')
        var above = 0;
        var below = 0;
        if (economyBoost)
            console.info('Spell slots boost Economy (instead of selling)');
        $.each($.kingdom.Building.buildingData, function (name, data) {
            var z = function (value) {
                return parseInt(value) || 0;
            };
            if (economyBoost)
                data.Economy = z(data.Economy) + z(data.minorItems) + 2*z(data.mediumItems) + 3*z(data.majorItems);
            if (calculate) {
                var cost = this.calculateIdealCost(data);
                if (cost == data.cost)
                    console.info(name + ' didn\'t change from ' + cost);
                else {
                    console.info(name + ' changed from ' + data.cost + ' to ' + cost + ' (' + (cost - data.cost).plus() + ')');
                    if (cost <= 0)
                        console.error('cost is <= 0');
                    if (data.cost - cost > below)
                        below = data.cost - cost;
                    else if (cost - data.cost > above)
                        above = cost - data.cost;
                }
                data.cost = cost;
            }
        });
        console.info('Prices varied from +' + above + ' to -' + below);
    },

    calculateIdealCost: function (data) {
        var z = function (value) {
            return parseInt(value) || 0;
        };
        var cost = 3 * (z(data.Economy) + z(data.Loyalty) + z(data.Stability) + z(data.Defense)) +
            Math.floor((z(data.cityValue) + 99) / 100) - z(data.Unrest);
        if (data.isHouse)
            cost += 3;
        if (data.adjacentHouses)
            cost -= 3 * data.adjacentHouses;
        if (data.halveCost)
            cost += 4 * data.halveCost.length;
        if (data.halveKingdom)
            cost += 8;
        if (!this.getBooleanChoice('hrCalculateEconomyBoost')) {
            if (data.majorItems)
                cost += 3 * 15;
            else if (data.mediumItems)
                cost += 3 * 8;
            else if (data.minorItems)
                cost += 3 * 2;
        }
        return cost;
    }

});

// ====================== SelectAffect class ======================

$.kingdom.SelectAffect = Class.create({

    init: function (kingdom, name, variety, effects, factor, factorAffecting) {
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

    selectChanged: function () {
        this.kingdom.setChoice(this.name, this.select.val());
    },

    apply: function () {
        var value = this.select.val();
        var effects = this.effects[value];
        if (!effects)
            return;
        $.each(Object.keys(effects), $.proxy(function (index, affecting) {
            var amount = effects[affecting];
            var factor = this.kingdom.get(this.factor);
            if (!factor || index == 0 || affecting != this.factorAffecting)
                factor = 1;
            this.kingdom.modify(affecting, parseInt(amount / factor), this.name, this.variety);
        }, this));
    }

});

// ====================== Person class ======================

$.kingdom.Person = Class.create({

    idPrefix: 'people.',

    statList: ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'],

    init: function (kingdom, name) {
        this.kingdom = kingdom;
        this.stats = {};
        this.setName(name || '');
        this.eachStat($.proxy(function (value, statName) {
            this.setStat(statName, value || 10);
        }, this));
    },

    getId: function (field) {
        field = field || '';
        return this.idPrefix + this.nameId + field;
    },

    setName: function (newName) {
        var newNameId = newName.toId() + '.';
        this.kingdom.changeId(this.getId(), this.idPrefix + newNameId, !newName);
        this.name = newName;
        this.nameId = newNameId;
    },

    setStat: function (statName, strValue) {
        var value = parseInt(strValue);
        this.stats[statName] = value;
        this.kingdom.setChoice(this.getId(statName), value);
    },

    getStat: function (statName) {
        return this.stats[statName];
    },

    getStatMod: function (statName) {
        var value = this.stats[statName];
        if (value < 10)
            value -= 1;
        return parseInt((value - 10) / 2);
    },

    eachStat: function (callback, statList) {
        statList = statList || this.statList;
        $.each(statList, $.proxy(function (index, statName) {
            var value = this.stats[statName];
            if (!value) {
                var statId = this.getId(statName);
                value = parseInt(this.kingdom.getChoice(statId));
                this.stats[statName] = value;
            }
            callback(value, statName);
        }, this));
    },

    getBestStat: function (statList) {
        var bestStat;
        var best;
        this.eachStat($.proxy(function (value, statName) {
            if (!best || value > best) {
                best = value;
                bestStat = statName;
            }
        }, this), statList);
        return bestStat;
    }

});

// ====================== PeopleTable class ======================

$.kingdom.PeopleTable = Class.create({

    peopleListId: 'peopleList',

    init: function (kingdom) {
        this.kingdom = kingdom;
        this.people = {};
        this.peopleTable = $('.people tbody');
        $('#addPersonButton').click($.proxy(this.addPersonHandler, this));
        // load anyone stored in kingdom
        var peopleList = this.kingdom.getArrayChoice(this.peopleListId);
        $.each(peopleList, $.proxy(function (index, name) {
            this.addPerson(new $.kingdom.Person(this.kingdom, name));
        }, this));
    },

    resetSheet: function () {
        this.people = {};
        this.peopleTable.empty();
    },

    addPersonHandler: function (evt) {
        var person = new $.kingdom.Person(this.kingdom);
        this.addPerson(person, true);
    },

    addPerson: function (person, editNameImmediately) {
        this.people[person.name] = person;
        var newRow = $('<tr></tr>');
        var nameCell = $('<td></td>').text(person.name).
        makeEditable($.proxy(this.finishEditingName, this));
        newRow.append(nameCell);
        person.eachStat($.proxy(function (value, statName) {
            var cell = $('<td></td>').text(value);
            cell.makeEditable($.proxy(function (element, newValue) {
                person.setStat(statName, newValue);
            }, this));
            newRow.append(cell);
        }, this));
        this.peopleTable.append(newRow);
        if (editNameImmediately)
            nameCell.click();
    },

    finishEditingName: function (element, newValue, oldValue) {
        newValue = newValue.trim();
        if (!newValue && oldValue) {
            var answer = confirm("Really delete " + oldValue + "?");
            if (!answer) {
                element.text(oldValue);
                return;
            }
        } else if (newValue && newValue != oldValue && this.people[newValue]) {
            alert('There is already someone named ' + newValue);
            element.text(oldValue);
            return;
        }
        var person = this.people[oldValue];
        person.setName(newValue);
        delete(this.people[oldValue]);
        if (newValue) {
            this.people[newValue] = person;
            element.text(newValue);
        } else
            $(element).parent().remove();
        this.kingdom.setChoice(this.peopleListId, Object.keys(this.people).sort());
        // TODO handle if they had a job
        if (oldValue) {}
    },

    getPerson: function (name) {
        return this.people[name];
    },

    getPeopleNames: function () {
        return Object.keys(this.people);
    }

});

// ====================== Leader class ======================

$.kingdom.Leader = Class.create({

    idPrefix: 'leader.',

    init: function (kingdom, peopleTable, tbody, title, abilities, affecting, vacantText, vacant) {
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
        if (personName) {
            this.setPerson(peopleTable.getPerson(personName));
            this.peopleSelect.setSelect([personName]);
        }
        this.peopleSelect.change($.proxy(this.peopleSelectChanged, this));
    },

    getId: function (field) {
        return this.idPrefix + this.title + '.' + field;
    },

    setAffecting: function (affecting) {
        var cell = this.row.find('td').eq(2);
        if (!$.isArray(affecting))
            cell.text(affecting);
        else if (affecting.length == 1) {
            this.affecting = affecting[0];
            cell.text(this.affecting);
        } else {
            this.affecting = this.kingdom.getChoice(this.getId('affecting'), affecting[0]);
            this.affectingSelect = cell.setSelect(affecting);
            this.affectingSelect.val(this.affecting);
            this.affectingSelect.change($.proxy(this.affectingSelectChanged, this));
        }
    },

    affectingSelectChanged: function (evt) {
        this.affecting = this.affectingSelect.val();
        this.kingdom.setChoice(this.getId('affecting'), this.affecting);
    },

    setPerson: function (person) {
        this.person = person;
        this.refresh();
    },

    peopleSelectChanged: function (evt) {
        var name = this.peopleSelect.val();
        if (name)
            this.setPerson(this.peopleTable.getPerson(name));
        else
            this.setPerson(null);
        this.kingdom.setChoice(this.getId('name'), name);
    },

    refresh: function () {
        var bestStat;
        if (this.person) {
            bestStat = this.person.getBestStat(this.abilities);
            this.modifier = this.person.getStatMod(bestStat);
        } else
            this.modifier = 0;
        var html = '';
        $.each(this.abilities, $.proxy(function (index, ability) {
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

    setRulerAffectingOptions: function () {
        var type = this.kingdom.getType();
        var options;
        if (type == 'Barony')
            options = ['Economy', 'Loyalty', 'Stability'];
        else if (type == 'Dutchy')
            options = ['Economy & Loyalty', 'Economy & Stability', 'Loyalty & Stability'];
        else
            options = ['Economy & Loyalty & Stability'];
        if (options.indexOf(this.affectingSelect.val()) < 0) {
            this.affectingSelect.setSelect(options);
            this.affectingSelectChanged();
        }
    },

    apply: function () {
        this.refresh();
        if (this.title == "Ruler")
            this.setRulerAffectingOptions();
        if (this.person) {
            var affecting = this.affecting;
            if (this.title == "Ruler's Spouse")
                affecting = this.ruler.affecting;
            var affectingList = affecting.split(' & ');
            $.each(affectingList, $.proxy(function (index, affecting) {
                this.kingdom.modify(affecting, this.modifier, "Leadership");
            }, this));
            if (this.title == 'Royal Assassin')
                this.kingdom.modify("UnrestRate", -1);
        } else
            this.vacant();
    },

    setPeopleOptions: function (idlePeople) {
        var oldName = this.peopleSelect.val();
        var newName = this.person ? this.person.name : '';
        if (oldName && newName && oldName != newName) {
            this.peopleSelect.setSelect(idlePeople, true, newName);
            this.kingdom.setChoice(this.getId('name'), newName);
        } else
            this.peopleSelect.setSelect(idlePeople, true);
    }

});

// ====================== LeaderTable class ======================

$.kingdom.LeaderTable = Class.create({

    init: function (kingdom, peopleTable) {
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
        this.addLeader(tbody, 'Marshal', ['Dexterity', 'Wisdom'], ['Economy'], 'Economy -4', function () {
            this.kingdom.modify("Economy", -4, "Vacancies");
        });
        this.addLeader(tbody, 'Royal Assassin', ['Strength', 'Dexterity'], ['Loyalty'], 'No penalty, but Unrest rate -1 if role filled', function () {});
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

    addLeader: function (tbody, title, ability, affecting, vacantText, vacant) {
        var leader = new $.kingdom.Leader(this.kingdom, this.peopleTable, tbody, title, ability, affecting, vacantText, vacant);
        this.leaders[leader.title] = leader;
    },

    getIdlePeople: function () {
        var peopleNames = this.peopleTable.getPeopleNames();
        $.each(Object.keys(this.leaders), $.proxy(function (index, title) {
            var leader = this.leaders[title];
            if (leader.person) {
                var index = peopleNames.indexOf(leader.person.name);
                if (index >= 0)
                    peopleNames.splice(index, 1);
            }
        }, this));
        return peopleNames.sort();
    },

    apply: function () {
        var idlePeople = this.getIdlePeople();
        idlePeople.splice(0, 0, ''); // insert a blank as the first element
        $.each(Object.keys(this.leaders), $.proxy(function (index, title) {
            var leader = this.leaders[title];
            leader.setPeopleOptions(idlePeople);
            leader.apply();
        }, this));
    }

});

// ====================== LimitsTable class ======================

$.kingdom.LimitsTable = Class.create({
    init: function (kingdom) {
        this.kingdom = kingdom;
    },

    limitFromArray: function (values) {
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

    getBuildLimitCities: function () {
        return this.limitFromArray([1, 1, 1, 2, 3, 4]);
    },

    getBuildLimitBuildings: function () {
        return this.limitFromArray([1, 2, 5, 10, 20, "no limit"]);
    },

    getBuildLimitHexes: function () {
        return this.limitFromArray([1, 2, 3, 4, 8, 12]);
    },

    getBuildLimitRoads: function () {
        return this.limitFromArray([1, 2, 3, 4, 6, 8]);
    },

    getBuildLimitFarmlands: function () {
        return this.limitFromArray([1, 1, 2, 2, 3, 4]);
    },

    refresh: function () {
        this.kingdom.set("limitCities", this.getBuildLimitCities());
        this.kingdom.set("limitBuildings", this.getBuildLimitBuildings());
        this.kingdom.set("limitHexes", this.getBuildLimitHexes());
        this.kingdom.set("limitRoads", this.getBuildLimitRoads());
        this.kingdom.set("limitFarmlands", this.getBuildLimitFarmlands());
    }

});

// ====================== Building class ======================

$.kingdom.Building = Class.create({

    init: function (name) {
        this.name = name;
        if (name == 'continue')
            return;
        else if (!$.kingdom.Building.buildingData[name])
            alert('Unknown building "' + name + '"');
        if (this.getImage())
            this.image = "images/" + this.getImage() + ".png";
        else
            this.image = "images/" + name + ".png";
    },

    toString: function (htmlBreaks) {
        var result = this.name;
        if (this.getOnePerCity())
            result += "\nOnly one per city.";
        if (this.getAdjacentHouses())
            result += "\nMust be adjacent to at least " + this.getAdjacentHouses() + " house" + ((this.getAdjacentHouses() > 1) ? "s." : ".");
        if (this.getAdjacentWater())
            result += "\nMust be adjacent to a water border.";
        if (this.getNoAdjacentHouses())
            result += "\nMust not be adjacent to any houses.";
        if (this.getHalveCost())
            result += "\nHalves the cost of " + this.getHalveCost().joinAnd() + " in this city.";
        if (this.getCityValue())
            result += "\nCity Base Value " + this.getCityValue().plus() + ".";
        if (this.getUnrest())
            result += "\nOne-off Unrest change of " + this.getUnrest().plus() + ".";
        if (this.getEconomy())
            result += "\nKingdom Economy " + this.getEconomy().plus() + ".";
        if (this.getLoyalty())
            result += "\nKingdom Loyalty " + this.getLoyalty().plus() + ".";
        if (this.getStability())
            result += "\nKingdom Stability " + this.getStability().plus() + ".";
        if (this.getDefense())
            result += "\nCity Defense " + this.getDefense().plus() + ".";
        var items = [];
        if (this.getMinorItems())
            items.push(this.getMinorItems().plus() + " minor item" +
                (this.getMinorItems() > 1 ? "s" : ""));
        if (this.getMediumItems())
            items.push(this.getMediumItems().plus() + " medium item" +
                (this.getMediumItems() > 1 ? "s" : ""));
        if (this.getMajorItems())
            items.push(this.getMajorItems().plus() + " major item" +
                (this.getMajorItems() > 1 ? "s" : ""));
        if (items.length)
            result += "\n" + items.joinAnd() + ".";
        if (this.getHalveKingdom())
            result += "\nHalves the overhead of " + this.getHalveKingdom() + " Kingdom-wide (doesn't stack).";
        if (this.getCorruption())
            result += "\nSettlement Corruption " + this.getCorruption().plus() + ".";
        if (this.getCrime())
            result += "\nSettlement Crime " + this.getCrime().plus() + ".";
        if (this.getLaw())
            result += "\nSettlement Law " + this.getLaw().plus() + ".";
        if (this.getLore()) {
            var lore = this.getLore();
            result += "\nSettlement Lore " + lore['default'].plus();
            $.each(lore, function (key, value) {
                if (value == 0) {
                    result += ', Lore bonus applies to ' + key;
                } else if (key != 'default') {
                    result += ", " + value.plus() + " to " + key;
                }
            });
            result += ".";
        }
        if (this.getProductivity())
            result += "\nSettlement Productivity " + this.getProductivity().plus() + ".";
        if (this.getSociety())
            result += "\nSettlement Society " + this.getSociety().plus() + ".";
        if (htmlBreaks) {
            result = result.replace(/\n/g, '<br/>');
        }
        return result;
    },

    apply: function (city) {
        if (this.getHalveCost()) {
            $.each(this.getHalveCost(), function (index, building) {
                city.halfCost[building] = true;
            });
        }
        if (this.getMinorItems())
            city.minorItems += this.getMinorItems();
        if (this.getMediumItems())
            city.mediumItems += this.getMediumItems();
        if (this.getMajorItems())
            city.majorItems += this.getMajorItems();
        if (this.getCityValue())
            city.value += this.getCityValue();
        if (this.getHalveKingdom()) {
            var factorName = this.getHalveKingdom() + 'Factor';
            city.kingdom.set(factorName, 2);
        }
        if (this.getEconomy())
            city.kingdom.modify("Economy", this.getEconomy(), "Buildings");
        if (this.getLoyalty())
            city.kingdom.modify("Loyalty", this.getLoyalty(), "Buildings");
        if (this.getStability())
            city.kingdom.modify("Stability", this.getStability(), "Buildings");
        if (this.getOnePerCity()) {
            if (city.onlyOne[this.name])
                alert("City " + city.name + " has more than one " + this.name);
            city.onlyOne[this.name] = true;
        }
        if (this.getDefense())
            city.defense += this.getDefense();
        var population;
        if (this.getSize() == '1x1')
            population = 250;
        else if (this.getSize() == '2x1')
            population = 500;
        else if (this.getSize() == '2x2')
            population = 1000;
        if (population) {
            city.kingdom.modify("Population", population, "City");
            city.population += population;
        }
        if (this.getCorruption())
            city.corruption += this.getCorruption();
        if (this.getCrime())
            city.crime += this.getCrime();
        if (this.getLaw())
            city.law += this.getLaw();
        if (this.getLore()) {
            $.each(this.getLore(), function (key, value) {
                city.lore[key] = (city.lore[key] || 0) + value;
            });
        }
        if (this.getProductivity())
            city.productivity += this.getProductivity();
        if (this.getSociety())
            city.society += this.getSociety();
    },

    getData: function () {
        return $.kingdom.Building.buildingData[this.name];
    },

    getSize: function () {
        return $.kingdom.Building.buildingData[this.name].size;
    },

    getImage: function () {
        return $.kingdom.Building.buildingData[this.name].image;
    },

    getCost: function () {
        return $.kingdom.Building.buildingData[this.name].cost;
    },

    getHalveCost: function () {
        return $.kingdom.Building.buildingData[this.name].halveCost;
    },

    getMinorItems: function () {
        return $.kingdom.Building.buildingData[this.name].minorItems;
    },

    getMediumItems: function () {
        return $.kingdom.Building.buildingData[this.name].mediumItems;
    },

    getMajorItems: function () {
        return $.kingdom.Building.buildingData[this.name].majorItems;
    },

    getEconomy: function () {
        return $.kingdom.Building.buildingData[this.name].Economy;
    },

    getLoyalty: function () {
        return $.kingdom.Building.buildingData[this.name].Loyalty;
    },

    getStability: function () {
        return $.kingdom.Building.buildingData[this.name].Stability;
    },

    getAdjacentHouses: function () {
        return $.kingdom.Building.buildingData[this.name].adjacentHouses;
    },

    getCityValue: function () {
        return $.kingdom.Building.buildingData[this.name].cityValue;
    },

    getHalveKingdom: function () {
        return $.kingdom.Building.buildingData[this.name].halveKingdom;
    },

    getOnePerCity: function () {
        return $.kingdom.Building.buildingData[this.name].onePerCity;
    },

    getDefense: function () {
        return $.kingdom.Building.buildingData[this.name].Defense;
    },

    getUnrest: function () {
        return $.kingdom.Building.buildingData[this.name].Unrest;
    },

    getBorderZ: function () {
        return $.kingdom.Building.buildingData[this.name].borderZ;
    },

    getBorderColour: function () {
        return $.kingdom.Building.buildingData[this.name].borderColour;
    },

    getOnlyEmpty: function () {
        return $.kingdom.Building.buildingData[this.name].onlyEmpty;
    },

    getExtraBuild: function () {
        return $.kingdom.Building.buildingData[this.name].extraBuild;
    },

    getIsHouse: function () {
        return $.kingdom.Building.buildingData[this.name].isHouse;
    },

    getAdjacentWater: function () {
        return $.kingdom.Building.buildingData[this.name].adjacentWater;
    },

    getNoAdjacentHouses: function () {
        return $.kingdom.Building.buildingData[this.name].noAdjacentHouses;
    },

    getUpgradeTo: function () {
        var name = $.kingdom.Building.buildingData[this.name].upgradeTo;
        if (name) {
            var result = [];
            if ($.isArray(name)) {
                $.each(name, function (index, value) {
                    result.push($.kingdom.Building.get(value));
                });
            } else {
                result.push($.kingdom.Building.get(name));
            }
            return result;
        } else {
            return null;
        }
    },

    getCorruption: function () {
        return $.kingdom.Building.buildingData[this.name].corruption;
    },

    getCrime: function () {
        return $.kingdom.Building.buildingData[this.name].crime;
    },

    getLaw: function () {
        return $.kingdom.Building.buildingData[this.name].law;
    },

    getLore: function () {
        return $.kingdom.Building.buildingData[this.name].lore;
    },

    getProductivity: function () {
        return $.kingdom.Building.buildingData[this.name].productivity;
    },

    getSociety: function () {
        return $.kingdom.Building.buildingData[this.name].society;
    }

});

$.kingdom.Building.buildings = {};

$.kingdom.Building.get = function (name) {
    if (!this.buildings[name])
        this.buildings[name] = new $.kingdom.Building(name);
    return this.buildings[name];
};

$.kingdom.Building.eachBuilding = function (callback) {
    var nameList = Object.keys($.kingdom.Building.buildingData);
    $.each(nameList, function (index, name) {
        var building = $.kingdom.Building.get(name);
        callback(building);
    });
};

// ====================== Ruin class ======================

$.kingdom.Ruin = Class.create({

    init: function (building) {
        this.building = building;
        this.image = building.image;
    },

    apply: function (city) {
    },

    getSize: function () {
        return this.building.getSize();
    },

    getIsHouse: function () {
	return false;
    },

    getNoAdjacentHouses: function () {
        return 0;
    },

    toString: function () {
        return 'Ruined ' + this.building.name;
    }

});

// ====================== District class ======================

$.kingdom.District = Class.create({

    bigBuilding: $.kingdom.Building.get('continue'),

    init: function (city, districtIndex) {
        this.city = city;
        this.districtIndex = districtIndex;
        this.load();
    },

    load: function () {
        this.buildings = [];
        var text = this.city.kingdom.getChoice(this.city.getId(this.districtIndex));
        if (text) {
            $.each(text.split(","), $.proxy(function (index, name) {
                var pair = name.split(":");
                var index = this.sideToIndex(pair[0]);
                if (!index)
                    index = parseInt(pair[0]);
                var name = $.trim(pair[1]);
                if (name.indexOf('*') == 0) {
                    var actual = name.substring(1);
                    this.buildings[index] = new $.kingdom.Ruin($.kingdom.Building.get(actual));
                } else {
                    this.buildings[index] = $.kingdom.Building.get(name);
                }
            }, this));
        } else {
            var land = $.kingdom.Building.get('Land');
            this.buildings[this.sideToIndex('top')] = land;
            this.buildings[this.sideToIndex('bottom')] = land;
            this.buildings[this.sideToIndex('left')] = land;
            this.buildings[this.sideToIndex('right')] = land;
        }
    },

    save: function () {
        var text = "";
        $.each(this.buildings, $.proxy(function (index, building) {
            if (building) {
                if (text)
                    text += ",";
                var side = this.indexToSide(index);
                if (side)
                    text += side;
                else
                    text += index;
                if (building instanceof $.kingdom.Ruin)
                    text += ":*" + building.building.name;
                else
                    text += ":" + building.name;
            }
        }, this));
        this.city.kingdom.setChoice(this.city.getId(this.districtIndex), text);
    },

    sideToIndex: function (side) {
        if (side == 'top')
            return 36;
        else if (side == 'bottom')
            return 37;
        else if (side == 'left')
            return 38;
        else if (side == 'right')
            return 39;
    },

    indexToSide: function (index) {
        if (index == 36)
            return 'top';
        else if (index == 37)
            return 'bottom';
        else if (index == 38)
            return 'left';
        else if (index == 39)
            return 'right';
    },

    oppositeSide: function (side) {
        if (side == 'top')
            return 'bottom';
        else if (side == 'bottom')
            return 'top';
        else if (side == 'left')
            return 'right';
        else if (side == 'right')
            return 'left';
    },

    renderBlock: function (x, y, index) {
        var building = this.buildings[index];
        var lot;
        if (building) {
            if (!building.image)
                return;
            lot = $("<img></img>").attr("src", building.image);
            lot.addClass('size' + building.getSize());
            if (!isTouchDevice()) {
                lot.attr("title", building.toString());
            }
            if (building.getSize() == '2x1') {
                if (this.buildings[index + 2] && !this.buildings[index + 2].image) {
                    lot.css({
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
            if (building instanceof $.kingdom.Ruin) {
                lot.addClass('ruin');
            }
        } else {
            lot = $("<div></div>");
            lot.addClass("emptyLot");
        }
        lot.attr("index", index);
        lot.click($.proxy(this.clickBuilding, this));
        lot.css({
            'top': y,
            'left': x
        });
        $(this.div).append(lot);
    },

    clickBuilding: function (evt) {
        var target = evt.target;
        var index = $(target).attr("index");
        this.city.kingdom.cityBuilder.select(evt, target, this, index);
    },

    renderSquare: function (x, y, index) {
        this.renderBlock(x, y, index);
        this.renderBlock(x + 80, y, index + 1);
        this.renderBlock(x, y + 80, index + 2);
        this.renderBlock(x + 80, y + 80, index + 3);
    },

    renderBorder: function (side) {
        var index = this.sideToIndex(side);
        var border = this.buildings[index];
        if (border) {
            var borderDiv = $('<div></div>').addClass('border');
            borderDiv.addClass(side);
            if (!isTouchDevice()) {
                borderDiv.attr('title', border.toString());
            }
            borderDiv.css({
                'background-color': border.getBorderColour(),
                'z-index': border.getBorderZ()
            });
            borderDiv.attr("index", index);
            borderDiv.click($.proxy(this.clickBuilding, this));
            $(this.div).append(borderDiv);
        }
    },

    renderBorders: function () {
        this.renderBorder('top');
        this.renderBorder('bottom');
        this.renderBorder('left');
        this.renderBorder('right');
    },

    render: function (parentElt) {
        if (this.div)
            this.div.empty();
        else
            this.div = $("<div></div>").addClass("cityDistrict");
        parentElt.append(this.div);
        var index = 0;
        for (var y = 0; y <= 400; y += 200)
            for (var x = 0; x <= 400; x += 200) {
                this.renderSquare(x, y, index);
                index += 4;
            }
        this.renderBorders();
    },

    apply: function () {
        this.city.kingdom.modify("Consumption", 1, "City District");
        $.each(this.buildings, $.proxy(function (index, building) {
            if (building && building != this.bigBuilding)
                building.apply(this.city);
        }, this));
    },

    countOccupiedLots: function (index) {
        var baseIndex = index & ~3;
        return (this.buildings[baseIndex] ? 1 : 0)
                + (this.buildings[baseIndex + 1] ? 1 : 0)
                + (this.buildings[baseIndex + 2] ? 1 : 0)
                + (this.buildings[baseIndex + 3] ? 1 : 0);
    },

    houseCount: function (building) {
        return (building && building.getIsHouse()) ? 1 : 0;
    },

    countAdjacentHouses: function (index) {
        var baseIndex = index & ~3;
        var houses = 0;
        houses += this.houseCount(this.buildings[baseIndex]);
        houses += this.houseCount(this.buildings[baseIndex + 1]);
        houses += this.houseCount(this.buildings[baseIndex + 2]);
        houses += this.houseCount(this.buildings[baseIndex + 3]);
        return houses;
    },

    getMinimumHouses: function (minimum, building) {
        if (building && building.getAdjacentHouses() && building.getAdjacentHouses() > minimum)
            minimum = building.getAdjacentHouses();
        return minimum;
    },

    getMinimumHousesForSquare: function (index) {
        var baseIndex = index & ~3;
        var minimum = this.getMinimumHouses(0, this.buildings[baseIndex]);
        minimum = this.getMinimumHouses(minimum, this.buildings[baseIndex + 1]);
        minimum = this.getMinimumHouses(minimum, this.buildings[baseIndex + 2]);
        minimum = this.getMinimumHouses(minimum, this.buildings[baseIndex + 3]);
        return minimum;
    },

    noAdjacentHousesBuildingName: function (index) {
        var building = this.buildings[index];
        return (building && building.getNoAdjacentHouses()) ? building.name : null;
    },

    noHousesAllowedCheck: function (index) {
        var baseIndex = index & ~3;
        return (this.noAdjacentHousesBuildingName(baseIndex) ||
            this.noAdjacentHousesBuildingName(baseIndex + 1) ||
            this.noAdjacentHousesBuildingName(baseIndex + 2) ||
            this.noAdjacentHousesBuildingName(baseIndex + 3));
    },

    canDemolish: function (index) {
        var building = this.buildings[index];
        if (building && building.getIsHouse()) {
            var houses = this.countAdjacentHouses(index);
            var minimumHouses = this.getMinimumHousesForSquare(index);
            if (houses - 1 < minimumHouses)
                return false;
        }
        return true;
    },

    get2x1ContinueIndex: function (index) {
        if ((index & 3) == 2 || this.buildings[index + 1] == this.bigBuilding)
            return index + 1;
        else
            return index + 2;
    },

    clearBuilding: function (index) {
        var building = this.buildings[index];
        this.buildings[index] = null;
        var size = building.getSize();
        if (size == '2x1') {
            this.buildings[this.get2x1ContinueIndex(index)] = null;
        } else if (size == '2x2') {
            this.buildings[index + 1] = null;
            this.buildings[index + 2] = null;
            this.buildings[index + 3] = null;
        }
        this.save();
        this.city.render();
        return building;
    },

    ruinBuilding: function(index)
    {
        var building = this.buildings[index];
        this.buildings[index] = new $.kingdom.Ruin(building);
        this.save();
        this.city.render();
    },

    repairBuilding: function(index)
    {
        var ruin = this.buildings[index];
        var cost = parseInt(this.buildingCost(ruin.building)/2);
        this.city.kingdom.spendTreasury(cost);
        this.buildings[index] = ruin.building;
        this.save();
        this.city.render();
    },

    /*
     * @param index The index of the 2x1 building
     * @param edge The block's edge: 0 = top, 1 = right, 2 = bottom, 3 = left
     * @param move True if the call should actually move the building, false to just test if it's legal.
     */
    move2x1ToEdge: function (index, edge, move) {
        var continueIndex = this.get2x1ContinueIndex(index);
        var edgeBase = (index & ~3) + ((edge == 3) ? 0 : edge);
        var edgeContinue = edgeBase + ((edge & 1) ? 2 : 1);
        if ((edgeBase == index && edgeContinue == continueIndex) ||
            (edgeBase != index && edgeBase != continueIndex && this.buildings[edgeBase]) ||
            (edgeContinue != index && edgeContinue != continueIndex && this.buildings[edgeContinue]))
            return false;
        if (move) {
            var building = this.clearBuilding(index);
            this.buildings[edgeBase] = building;
            this.buildings[edgeContinue] = this.bigBuilding;
            this.save();
            this.city.render();
        }
        return true;
    },

    isWaterBorder: function (side) {
        var borderIndex = this.sideToIndex(side);
        var border = this.buildings[borderIndex];
        if (border)
            return (border.name == 'Water');
        else {
            var neighbour = this.districtTo(side);
            return neighbour.isWaterBorder(this.oppositeSide(side));
        }
    },

    isAdjacentToWater: function (index, building) {
        var square = parseInt(index / 4);
        var isTop = (square < 3);
        var isBottom = (square >= 6);
        var isLeft = (square % 3) == 0;
        var isRight = (square % 3) == 2;
        var building = building || this.buildings[index];
        if (building && building.getSize() != '2x2') {
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

    buildingCost: function (building) {
        var cost = building.getCost();
        if (this.city.halfCost[building.name])
            cost /= 2;
        return cost;
    },

    setBuilding: function (building, index) {
        if (building.getSize() == '2x1') {
            var horz = (index & 1) ? -1 : 1;
            if (!this.buildings[index + horz] &&
                ((index & 3) != 1 || this.buildings[index + 2])) {
                index &= ~1;
                this.buildings[index + 1] = this.bigBuilding
            } else {
                index &= ~2;
                this.buildings[index + 2] = this.bigBuilding
            }
        } else if (building.getSize() == '2x2') {
            var index = index & ~3;
            this.buildings[index + 1] = this.bigBuilding;
            this.buildings[index + 2] = this.bigBuilding;
            this.buildings[index + 3] = this.bigBuilding;
        }
        this.buildings[index] = building;
        this.save();
        this.city.render();
    },

    getBuildingProblem: function (building, index) {
        var problem;
        var existing = this.buildings[index];
        if (building.getOnePerCity() && this.city.onlyOne[building.name])
            problem = "already one in this city";
        else if (building.getAdjacentWater() && !this.isAdjacentToWater(index, building))
            problem = "not adjacent to a water border";
        else if (building.getAdjacentHouses() && this.countAdjacentHouses(index) < building.getAdjacentHouses())
            problem = "not adjacent to at least " + building.getAdjacentHouses() + " house" + ((building.getAdjacentHouses() > 1) ? "s" : "");
        else if (building.getNoAdjacentHouses() && this.countAdjacentHouses(index) > 0)
            problem = "adjacent to houses";
        else if (building.getIsHouse() && this.noHousesAllowedCheck(index))
            problem = "no houses allowed adjacent to " + this.noHousesAllowedCheck(index);
        if (existing && building.getSize() <= existing.getSize()) {
            // replacing existing building of equal or greater size - no size problems
        } else if (building.getSize() == "2x1") {
            var horz = (index & 1) ? -1 : 1;
            var vert = (index & 2) ? -2 : 2;
            if (this.buildings[index + horz] && this.buildings[index + vert])
                problem = "not enough room - occupies 2 lots";
        } else if (building.getSize() == "2x2") {
            var baseIndex = index & (~3);
            var freeLots = ((this.buildings[baseIndex]) ? 0 : 1) +
                    ((this.buildings[baseIndex + 1]) ? 0 : 1) +
                    ((this.buildings[baseIndex + 2]) ? 0 : 1) +
                    ((this.buildings[baseIndex + 3]) ? 0 : 1);
            if (!existing)
                ;
            else if (existing.getSize() == '1x1')
                freeLots += 1;
            else if (existing.getSize() == '2x1')
                freeLots += 2;
            if (freeLots < 4)
                problem = "not enough room - occupies 4 lots";
        }
        if (building.getOnlyEmpty() && !this.isEmpty())
            problem = "can only be set on empty districts";
        if (!problem) {
            var cost = this.buildingCost(building);
            var treasury = this.city.kingdom.getTreasury();
            if (cost > treasury)
                problem = 'too expensive (' + cost + ' BP)';
        }
        return problem;
    },

    isEmpty: function () {
        var result = true;
        $.each(this.buildings, $.proxy(function (index, building) {
            if (building && !this.indexToSide(index))
                result = false;
        }, this));
        return result;
    },

    getExtensionCoords: function (side) {
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

    districtTo: function (side) {
        var index = this.sideToIndex(side);
        var border = this.buildings[index];
        var coords = this.getExtensionCoords(side);
        var result = null;
        $.each(this.city.districtMap, $.proxy(function (index, value) {
            if (value[0] == coords[0] && value[1] == coords[1])
                result = this.city.districts[index];
        }, this));
        return result;
    },

    extendCity: function (side) {
        var coords = this.getExtensionCoords(side);
        this.city.extend(coords);
    },

    rationaliseBorder: function (side) {
        var otherDistrict = this.districtTo(side);
        if (otherDistrict)
            this.buildings[this.sideToIndex(side)] = undefined;
    },

    buildBuilding: function (building, index, cost) {
        this.city.kingdom.spendTreasury(cost);
        this.setBuilding(building, index);
        if (building.getUnrest()) {
            var unrest = parseInt(this.city.kingdom.getChoice("unrest", 0));
            unrest += building.getUnrest();
            if (unrest < 0)
                unrest = 0;
            this.city.kingdom.setChoice("unrest", unrest);
        }
    },

    automatedImprovementFromList: function (list, treasuryLimit, buildingLimit, extraHouse, allowDuplicate) {
        var house = $.kingdom.Building.get('House');
        var landBorder = $.kingdom.Building.get('Land');
        if (buildingLimit == 0 && extraHouse) {
            list = [ house ];
        } else {
           // shuffle list to prevent building the same thing every time.
           list.shuffle();
        }
        var treasury = this.city.kingdom.getTreasury();
        for (var index = 0; index < list.length; ++index) {
            var building = list[index];
            // check if we can afford building
            var remainingTreasury = treasury - this.buildingCost(building);
            var ok = (remainingTreasury >= treasuryLimit);
            if (building.getSize() != 'border') {
                // check the building is a single lot
                ok = ok && (building.getSize() == '1x1');
                // if duplicates are not allowed, check if district already contains this building type
                for (var lot = 0; ok && !allowDuplicate && lot < this.buildings.length; ++lot) {
                    if (this.buildings[lot] && this.buildings[lot] == building) {
                        ok = false;
                    }
                }
            }
            if (ok) {
                var borderStart = this.sideToIndex('top');
                var end = (building.getSize() == 'border') ? borderStart + 4 : borderStart;
                var byWater = -1, newLot = -1, bestLot = -1;
                var additionalHouses = {}, reservoirHits = {};
                for (var lot = (building.getSize() == 'border') ? borderStart : 0; lot < end; ++lot) {
                    if ((lot < borderStart && this.buildings[lot]) ||
                            (lot >= borderStart && this.buildings[lot] !== landBorder) ||
                            (building.getAdjacentWater() && !this.isAdjacentToWater(lot))) {
                        continue;
                    }
                    var occupiedLots = this.countOccupiedLots(lot);
                    var adjacentHouses = this.countAdjacentHouses(lot);
                    additionalHouses[lot] = 0;
                    if (building.getAdjacentHouses() > 0) {
                        var extraHouseCount = building.getAdjacentHouses() - adjacentHouses;
                        if (extraHouseCount > 0) {
                            if (extraHouseCount > 3 - occupiedLots ||
                                    extraHouseCount + 1 > buildingLimit + (extraHouse ? 1 : 0) ||
                                    (remainingTreasury - this.buildingCost(house)*extraHouseCount < treasuryLimit)) {
                                continue;
                            }
                            additionalHouses[lot] = extraHouseCount;
                        }
                    } else if (adjacentHouses > 0) {
                        continue;
                    }
                    if (lot < borderStart && this.isAdjacentToWater(lot) && !building.getAdjacentWater()) {
                        byWater = this.lotWithFewestAdditionalHouses(byWater, lot, additionalHouses, reservoirHits);
                    } else if (lot < borderStart && occupiedLots == 0) {
                        newLot = this.lotWithFewestAdditionalHouses(newLot, lot, additionalHouses, reservoirHits);
                    } else {
                        bestLot = this.lotWithFewestAdditionalHouses(bestLot, lot, additionalHouses, reservoirHits);
                    }
                }
                var lot = (bestLot >= 0) ? bestLot : ((newLot >= 0) ? newLot : byWater);
                if (lot >= 0) {
                    var houseLot = (lot & ~3);
                    for (var houseCount = 0; houseCount < additionalHouses[lot]; ++houseCount) {
                        while (this.buildings[houseLot] || houseLot == lot) {
                            ++houseLot;
                        }
                        var problem = this.getBuildingProblem(house, houseLot);
                        if (problem) {
                            $('#improveCitiesOutput').append($('<div/>').text('Failed to build extra house! Problem: ' + problem).addClass('problem'));
                            return houseCount;
                        } else {
                            var houseCost = this.buildingCost(house);
                            $('#improveCitiesOutput').append($('<div/>').text('Building house in ' + this.city.name + ' for ' + houseCost + ' BP'));
                            this.buildBuilding(house, houseLot, houseCost);
                        }
                    }
                    var problem = this.getBuildingProblem(building, lot);
                    if (problem) {
                        $('#improveCitiesOutput').append($('<div/>').text('Failed to build ' + building.name + '! Problem: ' + problem).addClass('problem'));
                        return additionalHouses[lot];
                    } else {
                        var cost = this.buildingCost(building);
                        $('#improveCitiesOutput').append($('<div/>').text('Building ' + building.name + ' in ' + this.city.name + ' for ' + cost + ' BPs'));
                        this.buildBuilding(building, lot, cost);
                    }
                    return additionalHouses[lot] + 1;
                }
            }
        }
        return 0;
    },

    lotWithFewestAdditionalHouses: function (previous, current, additionalHouses, reservoirHits) {
        if (previous < 0 || additionalHouses[previous] > additionalHouses[current]) {
            reservoirHits[current] = 1;
            return current;
        } else if (additionalHouses[previous] == additionalHouses[current]) {
            var hits = reservoirHits[previous] + 1;
            var result = (parseInt(Math.random() * hits) == 0) ? current : previous;
            reservoirHits[result] = hits;
            return result;
        } else {
            return previous;
        }
    }

});

// ====================== City class ======================

$.kingdom.City = Class.create({

    init: function (kingdom, name) {
        this.kingdom = kingdom;
        this.terrain = null;
        this.name = name || "";
        this.itemSlots = { 'minor': [], 'medium': [], 'major': [] };
        this.reset();
        this.load();
        this.render();
        if (!name) {
            this.save();
            this.nameElement.editElement($.proxy(this.finishEditingCityName, this));
        }
    },

    reset: function () {
        this.value = 200;
        this.minorItems = 0;
        this.mediumItems = 0;
        this.majorItems = 0;
        this.halfCost = {};
        this.onlyOne = {};
        this.defense = 0;
        this.population = 0;
        this.corruption = 0;
        this.crime = 0;
        this.law = 0;
        this.lore = { 'default': 0 };
        this.productivity = 0;
        this.society = 0;
    },

    getId: function (field) {
        var cityNameId = this.name.toId();
        return "city." + cityNameId + "." + field;
    },

    load: function () {
        this.terrain = this.kingdom.getChoice(this.getId("terrain"));
        if (this.terrain == "undefined")
            this.terrain = undefined;
        var districtMap = this.kingdom.getArrayChoice(this.getId("districts"));
        this.districtMap = $.map(districtMap, function (value) {
            var coords = value.split(",");
            return [[parseInt(coords[0]), parseInt(coords[1])]];
        });
        if (this.districtMap.length == 0)
            this.districtMap = [
                [0, 0]
            ];
        this.districts = [];
        for (var index = 0; index < this.districtMap.length; ++index) {
            var district = new $.kingdom.District(this, index);
            this.districts.push(district);
        }
        this.itemSlots['minor'] = $.kingdom.MagicItem.loadArray(this.getId("minorItems"), this.kingdom);
        this.itemSlots['medium'] = $.kingdom.MagicItem.loadArray(this.getId("mediumItems"), this.kingdom);
        this.itemSlots['major'] = $.kingdom.MagicItem.loadArray(this.getId("majorItems"), this.kingdom);
    },

    save: function () {
        this.kingdom.setChoice(this.getId("terrain"), this.terrain);
        var districtMap = $.map(this.districtMap, function (value) {
            return value.join(",");
        });
        this.kingdom.setChoice(this.getId("districts"), districtMap);
        for (var index = 0; index < this.districts.length; ++index)
            this.districts[index].save();
        while (this.kingdom.getChoice(this.getId(index)) != undefined) {
            this.kingdom.clearChoice(this.getId(index));
            index++;
        }
        this.kingdom.setChoice("cityNames", Object.keys(this.kingdom.cities));
        this.kingdom.setChoice(this.getId("minorItems"), this.itemSlots['minor']);
        this.kingdom.setChoice(this.getId("mediumItems"), this.itemSlots['medium']);
        this.kingdom.setChoice(this.getId("majorItems"), this.itemSlots['major']);
    },

    finishEditingCityName: function (element, newValue, oldValue) {
        if (newValue.match(/^\s*$/))
            newValue = "";
        if (newValue == oldValue && newValue)
            return;
        if (newValue && this.kingdom.cities[newValue]) {
            alert("There is already a city with the name of " + newValue);
            element.text(oldValue);
            if (oldValue)
                return;
            else
                newValue = "";
        }
        if (newValue) {
            var oldId = this.getId('');
            this.name = newValue;
            this.kingdom.cities[newValue] = this
            delete this.kingdom.cities[oldValue];
            this.kingdom.changeId(oldId, this.getId(''));
            this.render();
        } else {
            // removing a city - confirm
            if (oldValue) {
                var answer = confirm("Really delete " + this.name + "?");
                if (!answer) {
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

    getDistrictCost: function () {
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

    getDistrictDelay: function () {
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

    appendTerrain: function (element) {
        var text = this.terrain;
        var cost = this.getDistrictCost();
        var delay = this.getDistrictDelay();
        text += " (preparing a district costs " + cost + " BP and takes " + delay + ")";
        element.append($("<span></span>").text(text));
    },

    render: function () {
        if (!this.parentDiv) {
            this.parentDiv = $('<div></div>');
            $("#citiesDiv").append(this.parentDiv);
            this.header = $("<h2></h2>").text("The city of ");
            this.parentDiv.append(this.header);
            this.nameElement = $("<span></span>").text(this.name);
            this.nameElement.makeEditable($.proxy(this.finishEditingCityName, this));
            var terrainText = $('<p></p>').text("A city in the ");
            if (this.terrain)
                this.appendTerrain(terrainText);
            else {
                var terrainSpan = $('<span></span>');
                terrainText.append(terrainSpan);
                var terrainSelect = terrainSpan.setSelect(["", "Forest", "Plains", "Hills", "Mountains", "Swamp"]);
                terrainSelect.attr('name', this.getId(this.name, "terrain"));
                terrainSelect.change($.proxy(function (evt) {
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
        var minRow = 0,
            minCol = 0;
        var maxRow = 0,
            maxCol = 0;
        $.each(this.districtMap, $.proxy(function (index, value) {
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
        for (var row = minRow; row <= maxRow; ++row) {
            var tr = $('<tr></tr>');
            this.table.append(tr);
            for (var col = minCol; col <= maxCol; ++col) {
                var td = $('<td></td>');
                tr.append(td);
                var districtIndex = map[col + ',' + row];
                if (districtIndex != undefined)
                    this.districts[districtIndex].render(td);
            }
        }
        this.refreshStats();
    },

    drawItemSlot: function (element, type, index) {
        if (this.itemSlots[type][index]) {
            var item = this.itemSlots[type][index];
            element.text(item.name);
            if (!isTouchDevice()) {
                element.attr('title', item.classification + ' item worth ' + item.price.commafy() + ' gp');
            }
            element.addClass(item.classification);
            if (item.price < 4000) {
                element.addClass('cheap');
            }
        } else {
            element.removeClass();
            element.text('Empty');
        }
    },

    createItemSlot: function (element, type, index) {
        this.drawItemSlot(element, type, index);
        element.click($.proxy(function (evt) {
            if (this.itemSlots[type][index]) {
                this.itemSlots[type][index] = null;
            } else {
                this.itemSlots[type][index] = this.kingdom.magicItemSource.chooseItem(type);
            }
            this.drawItemSlot(element, type, index);
            this.save();
        }, this));
    },

    refreshItemSlots: function () {
        this.statblock.find('.itemslots').each($.proxy(function (index, slotSpan) {
            slotSpan = $(slotSpan);
            var type = slotSpan.attr('type');
            var count = parseInt(slotSpan.attr('count'));
            slotSpan.empty();
            for (var index = 0; index < count; index++) {
                var info = $('<span/>');
                slotSpan.append(info);
                this.createItemSlot(info, type, index);
            }
        }, this));
    },

    fillItemSlotsOfType: function (type, number) {
        for (var slot = 0; slot < number; slot++) {
            if (this.itemSlots[type][slot] == null) {
                this.itemSlots[type][slot] = this.kingdom.magicItemSource.chooseItem(type);
            }
        }
    },

    fillItemSlots: function () {
        this.fillItemSlotsOfType('minor', this.minorItems);
        this.fillItemSlotsOfType('medium', this.mediumItems);
        this.fillItemSlotsOfType('major', this.majorItems);
        this.refreshItemSlots();
    },

    emptyCheapItemSlotsOfType: function (type, number) {
        var count = 0;
        for (var slot = 0; slot < number; slot++) {
            if (this.itemSlots[type][slot] && this.itemSlots[type][slot].price < 4000) {
                this.itemSlots[type][slot] = null;
                count++;
            }
        }
        return count;
    },

    emptyCheapItemSlots: function () {
        var count = 0;
        count += this.emptyCheapItemSlotsOfType('minor', this.minorItems);
        count += this.emptyCheapItemSlotsOfType('medium', this.mediumItems);
        count += this.emptyCheapItemSlotsOfType('major', this.majorItems);
        this.refreshItemSlots();
        this.save();
        return count;
    },

    findItemSlotsWithItemsOfType: function (itemType) {
        var result = [];
        var slotType = [ 'major', 'medium', 'minor' ];
        for (var slotTypeIndex = 0; slotTypeIndex < slotType.length; ++slotTypeIndex) {
            var slotList = this.itemSlots[slotType[slotTypeIndex]];
            for (var slot = 0; slot < slotList.length; ++slot) {
                if (slotList[slot] != null && slotList[slot].classification.toLowerCase() == itemType &&
                        slotList[slot].price >= 4000) {
                    result.push({city: this, slotType: slotType[slotTypeIndex], itemType: itemType, slot: slot});
                }
            }
        }
        return result;
    },

    automatedImprovement: function (buildings, treasuryLimit, buildingLimit, extraHouse, allowDuplicate) {
        for (var index = 0; index < this.districts.length; ++index) {
            var district = this.districts[index];
            var numBuilt = district.automatedImprovementFromList(buildings, treasuryLimit, buildingLimit, extraHouse, allowDuplicate);
            if (numBuilt > 0) {
                return numBuilt;
            }
        }
        return 0;
    },

    refreshStats: function () {
        var output = "";
        output += "<b>Districts:</b> " + this.districts.length + "<br/>";
        output += "<b>Base Value:</b> " + this.value.commafy() + " gp<br/>";
        output += "<b>Defense:</b> " + this.defense + "<br/>";
        output += "<b>Population:</b> " + this.population.commafy() + "<br/>";
        output += "<b>Half cost buildings:</b> " + Object.keys(this.halfCost).sort().joinAnd() + "<br/>";
         output += "<b>Minor items (DC 20 for 2 BPs):</b> " + this.minorItems + " <span class='itemslots' type='minor' count='" + this.minorItems + "'></span><br/>";
         output += "<b>Medium items (DC 35 for 8 BPs):</b> " + this.mediumItems + " <span class='itemslots' type='medium' count='" + this.mediumItems + "'></span><br/>";
         output += "<b>Major items (DC 50 for 15 BPs):</b> " + this.majorItems + " <span class='itemslots' type='major' count='" + this.majorItems + "'></span><br/>";
        var settlement = '';
        if (this.corruption)
            settlement += "<b>Corruption:</b> " + this.corruption.plus() + " to Bluff checks against city officials and Stealth checks made outside.<br/>";
        if (this.crime)
            settlement += "<b>Crime:</b> " + this.crime.plus() + " to Sense Motive checks to avoid being bluffed and Slight of Hand checks to pick pockets.<br/>";
        if (this.law)
            settlement += "<b>Law:</b> " + this.law.plus() + " to Intimidate checks to avoid violence, Diplomacy checks against city officials, and when calling the city guard.<br/>";
        if (this.lore['default']) {
            settlement += "<b>Lore:</b> " + this.lore['default'].plus() + " to Diplomacy checks to gather information";
            var suffix = '';
            $.each(this.lore, $.proxy(function (key, value) {
                if (value == 0)
                    settlement += ", " + key;
                else if (key != 'default')
                    suffix += ' ' + (this.lore['default'] + value).plus() + " total to " + key + '.';
            }, this));
            settlement += " and Knowledge checks.";
            settlement += suffix;
            settlement += "<br/>";
        }
        if (this.productivity)
            settlement += "<b>Productivity:</b> " + this.productivity.plus() + " to Craft, Perform and Profession checks made to generate income.<br/>";
        if (this.society)
            settlement += "<b>Society:</b> " + this.society.plus() + " to Disguise checks and Diplomacy checks against civilians.<br/>";
        if (settlement)
            output += '<b>Within this settlement:</b><div class="settlementStats">' + settlement + '</div>';
        this.statblock.html(output);
        this.refreshItemSlots();
    },

    apply: function () {
        this.reset();
        $.each(this.districts, function (index, district) {
            district.apply();
        });
        this.refreshStats();
    },

    extend: function (coords) {
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

$.kingdom.CityBuilder = Class.create({

    init: function (kingdom) {
        this.kingdom = kingdom;
        this.menu = $('#buildSelect');
    },

    select: function (evt, target, district, index) {
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

    openMenu: function (evt) {
        this.menu.show();
        this.colWidth = 50;
        $(document).bind("click.buildMenu", $.proxy(this.close, this));
        this.menu.css({
            'left': evt.pageX,
            'top': evt.pageY
        });
        this.menu.empty();
        this.twoCol = null;
    },

    startTwoColumn: function () {
        this.twoCol = $("<div></div>").addClass("twoColumn");
        this.menu.append(this.twoCol);
    },

    finishTwoColumn: function () {
        this.twoCol = null;
        this.menu.append($('<br/>'));
    },

    finishMenu: function () {
        this.menu.append($('<br/>'));
        this.addToMenu('Cancel', this.close);
    },

    addToMenu: function (label, action, text, title) {
        var row = $("<span></span>").addClass("noWrap");
        if (action) {
            action = $.proxy(action, this);
        }
        var labelElement;
        if (label) {
            if (action) {
                labelElement = $('<a></a>').attr('href', '').html(label);
                if (!isTouchDevice() || !title) {
                    labelElement.click(action);
                }
            } else {
                labelElement = $('<span></span>').html(label).addClass('problem');
            }
            row.append(labelElement);
        }
        if (text) {
            if (label)
                text = " &mdash; " + text;
            row.append($("<span></span>").html(text));
        }
        if (title) {
            if (isTouchDevice()) {
                labelElement.click(function (e) {
                    var titleDiv = $('#titleDiv');
                    titleDiv.html(title.replace(/\n/g, '<br/>'));
                    titleDiv.show();
                    titleDiv.css({ 'left': e.pageX - 20, 'top': e.pageY - 20 });
                    var buttons = $('<div></div>');
                    if (action) {
                        var okButton = $('<button>Ok</button>');
                        okButton.click(function (e) {
                            titleDiv.hide();
                            action();
                        });
                        buttons.append(okButton);
                    }
                    var closeButton = $('<button style="float:right">Close</button>');
                    closeButton.click(function (e) {
                        titleDiv.hide();
                        e.stopImmediatePropagation();
                        e.preventDefault();
                    });
                    buttons.append(closeButton);
                    titleDiv.append(buttons);
                    e.stopImmediatePropagation();
                    e.preventDefault();
                });
            } else {
                row.attr('title', title);
            }
        }
        row.append($('<br></br>'));
        if (this.twoCol) {
            this.twoCol.append(row);
            if (row.width() > this.colWidth) {
                this.colWidth = row.width();
                this.twoCol.css({
                    'width': this.colWidth * 2 + 50
                });
            }
        } else
            this.menu.append(row);
    },

    addBuildingToMenu: function (building, label, action, cost) {
        var problem = this.district.getBuildingProblem(building, this.index);
        if (problem)
            this.addToMenu(label || building.name, null, problem, building.toString());
        else {
            if (cost === undefined) {
                cost = this.district.buildingCost(building);
            }
            var activateFn;
            if (action) {
                activateFn = $.proxy(action, this, building, cost);
            } else {
                activateFn = $.proxy(this.buildBuilding, this, building, cost);
            }
            this.addToMenu(label || building.name, activateFn, cost + ' BP', building.toString());
        }
    },

    extend: function () {
        var side = this.district.indexToSide(this.index);
        this.district.extendCity(side);
        var cost = this.district.city.getDistrictCost();
        this.kingdom.spendTreasury(cost);
    },

    selectBorder: function (evt) {
        evt.stopPropagation();
        this.openMenu(evt);
        var side = this.district.indexToSide(this.index);
        var existingName = this.district.buildings[this.index] && this.district.buildings[this.index].name;
        if (existingName && isTouchDevice()) {
            this.addToMenu(null, null, existingName + '<hr/>');
        }
        $.kingdom.Building.eachBuilding($.proxy(function (building) {
            if (building.getSize() == 'border' && building.name != existingName)
                this.addBuildingToMenu(building);
        }, this));
        if (!this.district.districtTo(side)) {
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

    ruin: function () {
        this.district.ruinBuilding(this.index);
    },

    repair: function () {
        this.district.repairBuilding(this.index);
    },

    demolish: function () {
        this.district.clearBuilding(this.index);
    },

    upgrade: function (building, cost) {
        var existing = this.district.buildings[this.index];
        this.district.clearBuilding(this.index);
        this.buildBuilding(building, cost);
    },

    moveToNorth: function () {
        this.district.move2x1ToEdge(this.index, 0, true);
    },

    moveToSouth: function () {
        this.district.move2x1ToEdge(this.index, 2, true);
    },

    moveToEast: function () {
        this.district.move2x1ToEdge(this.index, 1, true);
    },

    moveToWest: function () {
        this.district.move2x1ToEdge(this.index, 3, true);
    },

    selectBuilding: function (evt) {
        this.openMenu(evt);
        var currBuilding = this.district.buildings[this.index];
        if (isTouchDevice()) {
            this.addToMenu(null, null, currBuilding.toString(true) + '<hr/>');
        }
        if (currBuilding instanceof $.kingdom.Ruin) {
            var cost = parseInt(this.district.buildingCost(currBuilding.building)/2);
            var treasury = this.kingdom.getTreasury();
            if (cost > treasury)
                this.addToMenu('Repair ruin &mdash; too expensive (' + cost + ' BP)');
            else
                this.addToMenu('Repair ruin &mdash; ' + cost + ' BP', this.repair);
            if (this.district.canDemolish(this.index))
                this.addToMenu('Demolish building', this.demolish);
        } else {
            this.addToMenu('Ruin building', this.ruin);
            if (this.district.canDemolish(this.index))
                this.addToMenu('Demolish building', this.demolish);
            var upgradeArray = currBuilding.getUpgradeTo();
            if (upgradeArray) {
                $.each(upgradeArray, $.proxy(function (index, upgradeBuilding) {
                    var cost = upgradeBuilding.getCost() - currBuilding.getCost();
                    this.addBuildingToMenu(upgradeBuilding, 'Upgrade to ' + upgradeBuilding.name, this.upgrade, cost);
                }, this));
            }
            if (currBuilding.getSize() == '2x1') {
                if (this.district.move2x1ToEdge(this.index, 0, false))
                    this.addToMenu('Move building to north edge', this.moveToNorth);
                if (this.district.move2x1ToEdge(this.index, 2, false))
                    this.addToMenu('Move building to south edge', this.moveToSouth);
                if (this.district.move2x1ToEdge(this.index, 1, false))
                    this.addToMenu('Move building to east edge', this.moveToEast);
                if (this.district.move2x1ToEdge(this.index, 3, false))
                    this.addToMenu('Move building to west edge', this.moveToWest);
            }
        }
        this.finishMenu();
    },

    buildBuilding: function (building, cost) {
        this.district.buildBuilding(building, this.index, cost);
        if (building.name == 'House' && this.kingdom.getChoice('extraHouse') == 'true') {
            this.kingdom.setExtraHouse(false);
        } else {
            var buildsThisTurn = parseInt(this.kingdom.getChoice('buildsThisTurn'));
            this.kingdom.setChoice('buildsThisTurn', buildsThisTurn + 1);
        }
    },

    selectEmptySite: function (evt) {
        this.openMenu(evt);
        this.startTwoColumn();
        $.kingdom.Building.eachBuilding($.proxy(function (building) {
            if (building.getSize() == '1x1' || building.getSize() == '2x1' || building.getSize() == '2x2')
                this.addBuildingToMenu(building);
        }, this));
        this.finishTwoColumn();
        this.addToMenu('Cancel', this.close);
    },

    close: function (evt) {
        $(document).unbind('click.buildMenu');
        this.menu.hide();
    	$('#titleDiv').hide();
        $(this.target).removeClass("buildingSite");
        this.district = null;
        if (evt) {
            evt.preventDefault();
        }
    }

});

// ====================== MagicItem class ======================

$.kingdom.MagicItem = Class.create({

    init: function (data, name, price) {
        if ($.isArray(data)) {
            this.classification = data[0];
            this.name = data[1];
            this.price = parseInt(data[2]);
        } else if ($.type(name) == 'object') {
            this.classification = data;
            this.name = name.name;
            $.each(name, $.proxy(function (key) {
                this[key] = name[key];
            }, this));
            this.price = parseInt(name.price);
        } else {
            this.classification = data;
            this.name = name;
            this.price = price;
        }
    },

    toString: function () {
        return this.classification + ';' + this.name + ';' + this.price;
    }

});

$.kingdom.MagicItem.loadArray = function (id, kingdom) {
    var array = kingdom.getArrayChoice(id);
    var result = [];
    for (var index = 0; index < array.length; ++index) {
        if (array[index]) {
            result.push(new $.kingdom.MagicItem(array[index].split(';')));
        } else {
            result.push(null);
        }
    }
    return result;
};

// ====================== MagicItemSource class ======================

$.kingdom.MagicItemSource = Class.create({

    magicItemData: {

        'Core Rulebook': {

            'Start': [
                [4, 10, 10, 'Armour and Shields' ],
                [9, 20, 20, 'Weapons' ],
                [44, 30, 25, 'Potions' ],
                [46, 40, 35, 'Rings' ],
                [null, 50, 45, 'Rods' ],
                [81, 65, 55, 'Scrolls' ],
                [null, 68, 75, 'Staves' ],
                [91, 83, 80, 'Wands' ],
                [100, 100, 100, 'Wondrous Items' ]
            ],

            'Armour and Shields': [
                [60, 5, null, { name: '+1 Shield', price: 1000, plus: 1, isShield: true }],
                [80, 10, null, { name: '+1 Armour', price: 1000, plus: 1 }],
                [85, 20, null, { name: '+2 Shield', price: 4000, plus: 2, isShield: true }],
                [87, 30, null, { name: '+2 Armour', price: 4000, plus: 2 }],
                [null, 40, 8, { name: '+3 Shield', price: 9000, plus: 3, isShield: true }],
                [null, 50, 16, { name: '+3 Armour', price: 9000, plus: 3 }],
                [null, 55, 27, { name: '+4 Shield', price: 16000, plus: 4, isShield: true }],
                [null, 57, 38, { name: '+4 Armour', price: 16000, plus: 4 }],
                [null, null, 49, { name: '+5 Shield', price: 25000, plus: 5, isShield: true }],
                [null, null, 57, { name: '+5 Armour', price: 25000, plus: 5 }],
                [89, 60, 60, 'Specific Armour' ],
                [91, 63, 63, 'Specific Shield' ],
                [100, 100, 100, '@addArmourShieldQuality' ]
            ],

            'Specific Armour': [
                [50, 25, null, { name: 'Mithral Shirt', price: 1100, plus: 0 }],
                [80, 45, null, { name: 'Dragonhide Plate', price: 1100, plus: 0 }],
                [100, 57, null, { name: 'Elven Chain', price: 5150, plus: 0 }],
                [null, 67, null, { name: 'Rhino Hide', price: 5165, plus: 2 }],
                [null, 82, 10, { name: 'Adamantine Breastplate', price: 10200, plus: 0 }],
                [null, 97, 20, { name: 'Dwarven Plate', price: 16500, plus: 0 }],
                [null, 100, 32, { name: 'Banded Mail of Luck', price: 18900, plus: 3 }],
                [null, null, 50, { name: 'Celestial Armour', price: 22400, plus: 3 }],
                [null, null, 60, { name: 'Plate Armour of the Deep', price: 24650, plus: 1 }],
                [null, null, 75, { name: 'Breastplate of Command', price: 25400 }],
                [null, null, 90, { name: 'Mithral Full Plate of Speed', price: 26500, plus: 1 }],
                [null, null, 100, { name: 'Demon Armour', price: 52260, plus: 4 }]
            ],

            'Armour Qualities': [
                [25, 5, 3, { name: 'Glamered', price: 2700 }],
                [32, 8, 4, { name: 'Light Fortification', plus: 1, type: '|fortification|' }],
                [52, 11, null, { name: 'Slick', price: 3750, type: '|slick|' }],
                [92, 17, null, { name: 'Shadow', price: 3750, type: '|shadow|' }],
                [96, 19, null, { name: 'Spell Resistance (13)', plus: 2, type: '|sr|' }],
                [97, 29, 7, { name: 'Improved Slick', price: 15000, type: '|slick|' }],
                [99, 49, 13, { name: 'Improved Shadow', price: 15000, type: '|shadow|' }],
                [null, 74, 28, { name: 'Energy Resistance', price: 18000, type: '|energy resistance|' }],
                [null, 79, 33, { name: 'Ghost Touch', plus: 3 }],
                [null, 84, 35, { name: 'Invulnerability', plus: 3 }],
                [null, 89, 40, { name: 'Moderate Fortification', plus: 3, type: '|fortification|' }],
                [null, 94, 42, { name: 'Spell Resistance (15)', plus: 3, type: '|sr|' }],
                [null, 99, 43, { name: 'Wild', plus: 3 }],
                [null, null, 48, { name: 'Greater Slick', price: 33750, type: '|slick|' }],
                [null, null, 58, { name: 'Greater Shadow', price: 33750, type: '|shadow|' }],
                [null, null, 83, { name: 'Improved Energy Resistance', price: 42000, type: '|energy resistance|' }],
                [null, null, 88, { name: 'Spell Resistance (17)', plus: 4, type: '|sr|' }],
                [null, null, 89, { name: 'Etherealness', price: 49000 }],
                [null, null, 90, { name: 'Undead Controlling', price: 49000 }],
                [null, null, 92, { name: 'Heavy Fortification', plus: 5, type: '|fortification|' }],
                [null, null, 94, { name: 'Spell Resistance (19)', plus: 5, type: '|sr|' }],
                [null, null, 99, { name: 'Greater Energy Resistance', price: 66000, type: '|energy resistance|' }],
                [100, 100, 100, '@rollTwice']
            ],

            'Specific Shield': [
                [30, 20, null, { name: 'Darkwood Buckler', price: 203, plus: 0, isShield: true }],
                [80, 45, null, { name: 'Darkwood Shield', price: 257, plus: 0, isShield: true }],
                [95, 70, null, { name: 'Mithral Heavy Shield', price: 1020, plus: 0, isShield: true }],
                [100, 85, 20, { name: 'Caster\'s Shield', price: 3153, plus: 1, isShield: true }],
                [null, 90, 40, { name: 'Spined Shield', price: 5580, plus: 1, isShield: true }],
                [null, 95, 60, { name: 'Lion\'s Shield', price: 9170, plus: 2, isShield: true }],
                [null, 100, 90, { name: 'Winged Shield', price: 17257, plus: 3, isShield: true }],
                [null, null, 100, { name: 'Absorbing Shield', price: 50170, plus: 1, isShield: true }]
            ],

            'Shield Qualities': [
                [20, 10, 5, { name: 'Arrow Catching', plus: 1 }],
                [40, 20, 8, { name: 'Bashing', plus: 1 }],
                [50, 25, 10, { name: 'Blinding', plus: 1 }],
                [75, 40, 15, { name: 'Light Fortification', plus: 1, type: '|fortification|' }],
                [92, 50, 20, { name: 'Arrow Deflection', plus: 2 }],
                [97, 57, 25, { name: 'Animated', plus: 2 }],
                [99, 59, null, { name: 'Spell Resistance (13)', plus: 2, type: '|sr|' }],
                [null, 79, 41, { name: 'Energy Resistance', price: 18000, type: '|energy resistance|' }],
                [null, 85, 46, { name: 'Ghost Touch', plus: 3 }],
                [null, 95, 56, { name: 'Moderate Fortification', plus: 3, type: '|fortification|' }],
                [null, 98, 58, { name: 'Spell Resistance (15)', plus: 3, type: '|sr|' }],
                [null, 99, 59, { name: 'Wild', plus: 3 }],
                [null, null, 84, { name: 'Improved Energy Resistance', price: 42000, type: '|energy resistance|' }],
                [null, null, 86, { name: 'Spell Resistance (17)', plus: 4, type: '|sr|' }],
                [null, null, 87, { name: 'Undead Controlling', price: 49000 }],
                [null, null, 91, { name: 'Heavy Fortification', plus: 5, type: '|fortification|' }],
                [null, null, 93, { name: 'Reflecting', plus: 5 }],
                [null, null, 94, { name: 'Spell Resistance (19)', plus: 5, type: '|sr|' }],
                [null, null, 99, { name: 'Greater Energy Resistance', price: 66000, type: '|energy resistance|' }],
                [100, 100, 100, '@rollTwice' ]
            ],

            'Weapons': [
                [70, 10, null, { name: '+1 Random Weapon', price: 2000, plus: 1 }],
                [85, 29, null, { name: '+2 Random Weapon', price: 8000, plus: 2 }],
                [null, 58, 20, { name: '+3 Random Weapon', price: 18000, plus: 3 }],
                [null, 62, 38, { name: '+4 Random Weapon', price: 32000, plus: 4 }],
                [null, null, 49, { name: '+5 Random Weapon', price: 50000, plus: 5 }],
                [90, 68, 63, 'Specific Weapon'],
                [100, 100, 100, '@addWeaponQuality']
            ],

            'Specific Weapon': [
                [15, null, null, { name: 'Sleep Arrow', price: 132, plus: 1, isAmmo: true }],
                [25, null, null, { name: 'Screaming Bolt', price: 267, plus: 2, isAmmo: true }],
                [45, null, null, { name: 'Masterwork Silver Dagger', price: 322, plus: 0 }],
                [65, null, null, { name: 'Masterwork Cold Iron Longsword', price: 330, plus: 0 }],
                [75, 9, null, { name: 'Javelin of Lightning', price: 1500, plus: 0, noQualities: true }],
                [80, 15, null, { name: 'Slaying Arrow', price: 2282, plus: 1, isAmmo: true }],
                [90, 24, null, { name: 'Adamantine Dagger', price: 3002, plus: 0 }],
                [100, 33, null, { name: 'Adamantine Battleaxe', price: 3010, plus: 0 }],
                [null, 37, null, { name: 'Slaying Arrow (Greater)', price: 4057, plus: 1, isAmmo: true }],
                [null, 40, null, { name: 'Shatterspike', price: 4315, plus: 4 }],
                [null, 46, null, { name: 'Dagger of Venom', price: 8302, plus: 1 }],
                [null, 51, null, { name: 'Trident of Warning', price: 10115, plus: 2 }],
                [null, 57, 4, { name: 'Assassin\'s Dagger', price: 10302, plus: 2 }],
                [null, 62, 7, { name: 'Shifter\'s Sorrow', price: 12780, plus: 1 }],
                [null, 66, 9, { name: 'Trident of Fish Command', price: 18650, plus: 1 }],
                [null, 74, 13, { name: 'Flame Tongue', price: 20715, plus: 1 }],
                [null, 79, 17, { name: 'Luck Blade (0 Wishes)', price: 22060, plus: 2 }],
                [null, 86, 24, { name: 'Sword of Subtlety', price: 22310, plus: 4 }],
                [null, 91, 31, { name: 'Sword of the Planes', price: 22315, plus: 2 }],
                [null, 95, 37, { name: 'Nine Lives Stealer', price: 23057, plus: 2 }],
                [null, 98, 42, { name: 'Oathbow', price: 25600, plus: 2, isRanged: true }],
                [null, 100, 46, { name: 'Sword of Life Stealing', price: 25715, plus: 2 }],
                [null, null, 51, { name: 'Mace of Terror', price: 38552, plus: 2 }],
                [null, null, 57, { name: 'Life-Drinker', price: 40320, plus: 1 }],
                [null, null, 62, { name: 'Sylvan Scimitar', price: 47315, plus: 3 }],
                [null, null, 67, { name: 'Rapier of Puncturing', price: 50320, plus: 4 }],
                [null, null, 73, { name: 'Sun Blade', price: 50335, plus: 4 }],
                [null, null, 79, { name: 'Frost Brand', price: 54475, plus: 3 }],
                [null, null, 84, { name: 'Dwarven Thrower', price: 60312, plus: 4 }],
                [null, null, 91, { name: 'Luck Blade (1 Wish)', price: 62360, plus: 2 }],
                [null, null, 95, { name: 'Mace of Smiting', price: 75312, plus: 3 }],
                [null, null, 97, { name: 'Luck Blade (2 Wishes)', price: 102660, plus: 2 }],
                [null, null, 99, { name: 'Holy Avenger', price: 120630, plus: 7 }],
                [null, null, 100, { name: 'Luck Blade (3 Wishes)', price: 142960, plus: 2 }]
            ],

            'Melee Weapon Qualities': [
                [10, 6, 3, { name: 'Bane', plus: 1 }],
                [17, 12, null, { name: 'Defending', plus: 1 }],
                [27, 19, 6, { name: 'Flaming', plus: 1 }],
                [37, 26, 9, { name: 'Frost', plus: 1 }],
                [47, 33, 12, { name: 'Shock', plus: 1 }],
                [56, 38, 15, { name: 'Ghost Touch', plus: 1 }],
                [67, 44, null, { name: 'Keen', plus: 1 }],
                [71, 48, 19, { name: 'Ki Focus', plus: 1 }],
                [75, 50, null, { name: 'Merciful', plus: 1 }],
                [82, 54, 21, { name: 'Mighty Cleaving', plus: 1 }],
                [87, 59, 24, { name: 'Spell Storing', plus: 1 }],
                [91, 63, 28, { name: 'Throwing', plus: 1 }],
                [95, 65, 32, { name: 'Thundering', plus: 1 }],
                [99, 69, 36, { name: 'Vicious', plus: 1 }],
                [null, 72, 41, { name: 'Anarchic', plus: 2 }],
                [null, 75, 46, { name: 'Axiomatic', plus: 2 }],
                [null, 78, 49, { name: 'Disruption', plus: 2 }],
                [null, 81, 54, { name: 'Flaming Burst', plus: 2 }],
                [null, 84, 59, { name: 'Icy Burst', plus: 2 }],
                [null, 87, 64, { name: 'Holy', plus: 2 }],
                [null, 90, 69, { name: 'Shocking Burst', plus: 2 }],
                [null, 93, 74, { name: 'Unholy', plus: 2 }],
                [null, 95, 78, { name: 'Wounding', plus: 2 }],
                [null, null, 83, { name: 'Speed', plus: 3 }],
                [null, null, 86, { name: 'Brilliant Energy', plus: 4 }],
                [null, null, 88, { name: 'Dancing', plus: 4 }],
                [null, null, 90, { name: 'Vorpal', plus: 5 }],
                [100, 100, 100, '@rollTwice']
            ],

            'Ranged Weapon Qualities': [
                [12, 8, 4, { name: 'Bane', plus: 1 }],
                [25, 16, 8, { name: 'Distance', plus: 1 }],
                [40, 28, 12, { name: 'Flaming', plus: 1 }],
                [55, 40, 16, { name: 'Frost', plus: 1 }],
                [60, 42, null, { name: 'Merciful', plus: 1 }],
                [68, 47, 21, { name: 'Returning', plus: 1 }],
                [83, 59, 25, { name: 'Shock', plus: 1 }],
                [93, 64, 27, { name: 'Seeking', plus: 1 }],
                [99, 68, 29, { name: 'Thundering', plus: 1 }],
                [null, 71, 34, { name: 'Anarchic', plus: 2 }],
                [null, 74, 39, { name: 'Axiomatic', plus: 2 }],
                [null, 79, 49, { name: 'Flaming Burst', plus: 2 }],
                [null, 82, 54, { name: 'Holy', plus: 2 }],
                [null, 87, 64, { name: 'Icy Burst', plus: 2 }],
                [null, 92, 74, { name: 'Shocking Burst', plus: 2 }],
                [null, 95, 79, { name: 'Unholy', plus: 2 }],
                [null, null, 84, { name: 'Speed', plus: 3 }],
                [null, null, 90, { name: 'Brilliant Energy', plus: 4 }],
                [100, 100, 100, '@rollTwice']
            ],

            'Potions': [
                [20, null, null, { name: '0th-level Potion', price: 25 }],
                [60, 20, null, { name: '1st-level Potion', price: 50 }],
                [100, 60, 20, { name: '2nd-level Potion', price: 300 }],
                [null, 100, 100, { name: '3rd-level Potion', price: 750 }]
            ],

            'Rings': [
                [18, null, null, { name: 'Ring of Protection +1', price: 2000 }],
                [28, null, null, { name: 'Ring of Feather Falling', price: 2200 }],
                [36, null, null, { name: 'Ring of Sustenance', price: 2500 }],
                [44, null, null, { name: 'Ring of Climbing', price: 2500 }],
                [52, null, null, { name: 'Ring of Jumping', price: 2500 }],
                [60, null, null, { name: 'Ring of Swimming', price: 2500 }],
                [70, 5, null, { name: 'Ring of Counterspells', price: 4000 }],
                [75, 8, null, { name: 'Ring of Mind Shielding', price: 8000 }],
                [80, 18, null, { name: 'Ring of Protection +2', price: 8000 }],
                [85, 23, null, { name: 'Ring of Force Shield', price: 8500 }],
                [90, 28, null, { name: 'Ring of the Ram', price: 8600 }],
                [null, 34, null, { name: 'Ring of Climbing, Improved', price: 10000 }],
                [null, 40, null, { name: 'Ring of Jumping, Improved', price: 10000 }],
                [null, 46, null, { name: 'Ring of Swimming, Improved', price: 10000 }],
                [93, 50, null, { name: 'Ring of Animal Friendship', price: 10800 }],
                [96, 56, 2, { name: 'Ring of Energy Resistance, Minor', price: 12000 }],
                [98, 61, null, { name: 'Ring of Chameleon Power', price: 12700 }],
                [100, 66, null, { name: 'Ring of Water Walking', price: 15000 }],
                [null, 71, 7, { name: 'Ring of Protection +3', price: 18000 }],
                [null, 76, 10, { name: 'Ring of Spell Storing, Minor', price: 18000 }],
                [null, 81, 15, { name: 'Ring of Invisibility', price: 20000 }],
                [null, 85, 19, { name: 'Ring of Wizardry (I)', price: 20000 }],
                [null, 90, 25, { name: 'Ring of Evasion', price: 25000 }],
                [null, 93, 28, { name: 'Ring of X-ray Vision', price: 25000 }],
                [null, 97, 32, { name: 'Ring of Blinking', price: 27000 }],
                [null, 100, 39, { name: 'Ring of Energy Resistance, Major', price: 28000 }],
                [null, null, 49, { name: 'Ring of Protection +4', price: 32000 }],
                [null, null, 55, { name: 'Ring of Wizardry (II)', price: 40000 }],
                [null, null, 60, { name: 'Ring of Freedom of Movement', price: 40000 }],
                [null, null, 63, { name: 'Ring of Energy Resistance, Greater', price: 44000 }],
                [null, null, 65, { name: 'Ring of Friend Shield (Pair)', price: 50000 }],
                [null, null, 70, { name: 'Ring of Protection +5', price: 50000 }],
                [null, null, 74, { name: 'Ring of Shooting Stars', price: 50000 }],
                [null, null, 79, { name: 'Ring of Spell Storing', price: 50000 }],
                [null, null, 83, { name: 'Ring of Wizardry (III)', price: 70000 }],
                [null, null, 86, { name: 'Ring of Telekinesis', price: 75000 }],
                [null, null, 88, { name: 'Ring of Regeneration', price: 90000 }],
                [null, null, 91, { name: 'Ring of Spell Turning', price: 100000 }],
                [null, null, 93, { name: 'Ring of Wizardy (IV)', price: 100000 }],
                [null, null, 94, { name: 'Ring of Three Wishes', price: 120000 }],
                [null, null, 95, { name: 'Ring of Djinni Calling', price: 125000 }],
                [null, null, 96, { name: 'Ring of Air Elemental Command', price: 200000 }],
                [null, null, 97, { name: 'Ring of Earth Elemental Command', price: 200000 }],
                [null, null, 98, { name: 'Ring of Fire Elemental Command', price: 200000 }],
                [null, null, 99, { name: 'Ring of Water Elemental Command', price: 200000 }],
                [null, null, 100, { name: 'Ring of Spell Storing, Major', price: 200000 }]
            ],

            'Rods': [
                [null, 7, null, { name: 'Metamagic Rod, Enlarge, Lesser', price: 3000 }],
                [null, 14, null, { name: 'Metamagic Rod, Extend, Lesser', price: 3000 }],
                [null, 21, null, { name: 'Metamagic Rod, Silent, Lesser', price: 3000 }],
                [null, 28, null, { name: 'Immovable Rod', price: 5000 }],
                [null, 35, null, { name: 'Metamagic Rod, Empower, Lesser', price: 9000 }],
                [null, 42, null, { name: 'Rod of Metal and Mineral Detection', price: 10500 }],
                [null, 53, 4, { name: 'Rod of Cancellation', price: 11000 }],
                [null, 57, 6, { name: 'Metamagic Rod, Enlarge', price: 11000 }],
                [null, 61, 8, { name: 'Metamagic Rod, Extend', price: 11000 }],
                [null, 65, 10, { name: 'Metamagic Rod, Silent', price: 11000 }],
                [null, 71, 14, { name: 'Rod of Wonder', price: 12000 }],
                [null, 79, 19, { name: 'Rod of the Python', price: 13000 }],
                [null, 83, null, { name: 'Metamagic Rod, Maximize, Lesser', price: 14000 }],
                [null, 89, 21, { name: 'Rod of Flame Extinguishing', price: 15000 }],
                [null, 97, 25, { name: 'Rod of the Viper', price: 19000 }],
                [null, null, 30, { name: 'Rod of Enemy Detection', price: 23500 }],
                [null, null, 36, { name: 'Metamagic Rod, Enlarge, Greater', price: 24500 }],
                [null, null, 42, { name: 'Metamagic Rod, Extend, Greater', price: 24500 }],
                [null, null, 48, { name: 'Metamagic Rod, Silent, Greater', price: 24500 }],
                [null, null, 53, { name: 'Rod of Splendor', price: 25000 }],
                [null, null, 58, { name: 'Rod of Withering', price: 25000 }],
                [null, 99, 64, { name: 'Metamagic Rod, Empower', price: 32500 }],
                [null, null, 69, { name: 'Rod of Thunder and Lightning', price: 33000 }],
                [null, 100, 73, { name: 'Metamagic Rod, Quicken, Lesser', price: 35000 }],
                [null, null, 77, { name: 'Rod of Negation', price: 37000 }],
                [null, null, 80, { name: 'Rod of Absorption', price: 50000 }],
                [null, null, 84, { name: 'Rod of Flailing', price: 50000 }],
                [null, null, 86, { name: 'Metamagic Rod, Maximize', price: 54000 }],
                [null, null, 88, { name: 'Rod of Rulership', price: 60000 }],
                [null, null, 90, { name: 'Rod of Security', price: 61000 }],
                [null, null, 92, { name: 'Rod of Lordly Might', price: 70000 }],
                [null, null, 94, { name: 'Metamagic Rod, Empower, Greater', price: 73000 }],
                [null, null, 96, { name: 'Metamagic Rod, Quicken', price: 75500 }],
                [null, null, 98, { name: 'Rod of Alertness', price: 85000 }],
                [null, null, 99, { name: 'Metamagic Rod, Maximize, Greater', price: 121500 }],
                [null, null, 100, { name: 'Metamagic Rod, Quicken, Greater', price: 170000 }]
            ],

            'Scrolls': [
                [5, null, null, { name: '0th Level Scroll', price: 12.5 }],
                [50, null, null, { name: '1st Level Scroll', price: 25 }],
                [95, 5, null, { name: '2nd Level Scroll', price: 150 }],
                [100, 65, null, { name: '3rd Level Scroll', price: 375 }],
                [null, 95, 5, { name: '4th Level Scroll', price: 700 }],
                [null, 100, 50, { name: '5th Level Scroll', price: 1125 }],
                [null, null, 70, { name: '6th Level Scroll', price: 1650 }],
                [null, null, 85, { name: '7th Level Scroll', price: 2275 }],
                [null, null, 95, { name: '8th Level Scroll', price: 3000 }],
                [null, null, 100, { name: '9th Level Scroll', price: 3825 }]
            ],

            'Staves': [
                [null, 15, 3, { name: 'Staff of Charming', price: 17600 }],
                [null, 30, 9, { name: 'Staff of Fire', price: 18950 }],
                [null, 40, 11, { name: 'Staff of Swarming Insects', price: 22800 }],
                [null, 55, 13, { name: 'Staff of Size Alteration', price: 26150 }],
                [null, 75, 19, { name: 'Staff of Healing', price: 29600 }],
                [null, 90, 24, { name: 'Staff of Frost', price: 41400 }],
                [null, 95, 31, { name: 'Staff of Illumination', price: 51500 }],
                [null, 100, 38, { name: 'Staff of Defense', price: 62000 }],
                [null, null, 45, { name: 'Staff of Abjuration', price: 82000 }],
                [null, null, 50, { name: 'Staff of Conjuration', price: 82000 }],
                [null, null, 55, { name: 'Staff of Divination', price: 82000 }],
                [null, null, 60, { name: 'Staff of Enchantment', price: 82000 }],
                [null, null, 65, { name: 'Staff of Evocation', price: 82000 }],
                [null, null, 70, { name: 'Staff of Illusion', price: 82000 }],
                [null, null, 75, { name: 'Staff of Necromancy', price: 82000 }],
                [null, null, 80, { name: 'Staff of Transmutation', price: 82000 }],
                [null, null, 85, { name: 'Staff of Earth and Stone', price: 85800 }],
                [null, null, 90, { name: 'Staff of Woodlands', price: 100400 }],
                [null, null, 95, { name: 'Staff of Life', price: 109400 }],
                [null, null, 98, { name: 'Staff of Passage', price: 206900 }],
                [null, null, 100, { name: 'Staff of Power', price: 235000 }]
            ],

            'Wands': [
                [5, null, null, { name: '0th Level Wand', price: 375 }],
                [60, null, null, { name: '1st Level Wand', price: 750 }],
                [100, 60, null, { name: '2nd Level Wand', price: 4500 }],
                [null, 100, 60, { name: '3rd Level Wand', price: 11250 }],
                [null, null, 100, { name: '4th Level Wand', price: 21000 }]
            ],

            'Wondrous Items': [
                [1, null, null, { name: 'Feather Token, Anchor', price: 50 }],
                [2, null, null, { name: 'Universal Solvent', price: 50 }],
                [3, null, null, { name: 'Elixir of Love', price: 150 }],
                [4, null, null, { name: 'Unguent of Timelessness', price: 150 }],
                [5, null, null, { name: 'Feather Token, Fan', price: 200 }],
                [6, null, null, { name: 'Dust of Tracelessness', price: 250 }],
                [7, null, null, { name: 'Elixir of Hiding', price: 250 }],
                [8, null, null, { name: 'Elixir of Tumbling', price: 250 }],
                [9, null, null, { name: 'Elixir of Swimming', price: 250 }],
                [10, null, null, { name: 'Elixir of Vision', price: 250 }],
                [11, null, null, { name: 'Silversheen', price: 250 }],
                [12, null, null, { name: 'Feather Token, Bird', price: 300 }],
                [13, null, null, { name: 'Feather Token, Tree', price: 400 }],
                [14, null, null, { name: 'Feather Token, Swan Boat', price: 450 }],
                [15, null, null, { name: 'Elixir of Truth', price: 500 }],
                [16, null, null, { name: 'Feather Token, Whip', price: 500 }],
                [17, null, null, { name: 'Dust of Dryness', price: 850 }],
                [18, null, null, { name: 'Hand of the Mage', price: 900 }],
                [19, null, null, { name: 'Bracers of Armor +1', price: 1000 }],
                [20, null, null, { name: 'Cloak of Resistance +1', price: 1000 }],
                [21, null, null, { name: 'Pearl of Power, 1st-level Spell', price: 1000 }],
                [22, null, null, { name: 'Phylactery of Faithfulness', price: 1000 }],
                [23, null, null, { name: 'Salve of Slipperiness', price: 1000 }],
                [24, null, null, { name: 'Elixir of Fire Breath', price: 1100 }],
                [25, null, null, { name: 'Pipes of the Sewers', price: 1150 }],
                [26, null, null, { name: 'Dust of Illusion', price: 1200 }],
                [27, null, null, { name: 'Brooch of Shielding', price: 1500 }],
                [28, null, null, { name: 'Necklace of Fireballs Type I', price: 1650 }],
                [29, null, null, { name: 'Dust of Appearance', price: 1800 }],
                [30, null, null, { name: 'Hat of Disguise', price: 1800 }],
                [31, null, null, { name: 'Pipes of Sounding', price: 1800 }],
                [32, null, null, { name: 'Efficient Quiver', price: 1800 }],
                [33, null, null, { name: 'Amulet of Natural Armor +1', price: 2000 }],
                [34, null, null, { name: 'Handy Haversack', price: 2000 }],
                [35, null, null, { name: 'Horn of Fog', price: 2000 }],
                [36, null, null, { name: 'Elemental Gem', price: 2250 }],
                [37, null, null, { name: 'Robe of Bones', price: 2400 }],
                [38, null, null, { name: 'Sovereign Glue', price: 2400 }],
                [39, null, null, { name: 'Bag of Holding Type I', price: 2500 }],
                [40, null, null, { name: 'Boots of Elvenkind', price: 2500 }],
                [41, null, null, { name: 'Boots of the Winterlands', price: 2500 }],
                [42, null, null, { name: 'Candle of Truth', price: 2500 }],
                [43, null, null, { name: 'Cloak of Elvenkind', price: 2500 }],
                [44, null, null, { name: 'Eyes of the Eagle', price: 2500 }],
                [45, null, null, { name: 'Goggles of Minute Seeing', price: 2500 }],
                [46, null, null, { name: 'Scarab, Golembane', price: 2500 }],
                [47, null, null, { name: 'Necklace of Fireballs Type II', price: 2700 }],
                [48, null, null, { name: 'Stone of Alarm', price: 2700 }],
                [49, null, null, { name: 'Bead of Force', price: 3000 }],
                [50, null, null, { name: 'Chime of Opening', price: 3000 }],
                [51, null, null, { name: 'Horseshoes of Speed', price: 3000 }],
                [52, null, null, { name: 'Rope of Climbing', price: 3000 }],
                [53, null, null, { name: 'Bag of Tricks, Gray', price: 3400 }],
                [54, null, null, { name: 'Dust of Disappearance', price: 3500 }],
                [55, null, null, { name: 'Lens of Detection', price: 3500 }],
                [56, null, null, { name: 'Vestment, Druid\'s', price: 3750 }],
                [57, null, null, { name: 'Figurine of Wondrous Power, Silver Raven', price: 3800 }],
                [58, null, null, { name: 'Belt of Giant Strength +2', price: 4000 }],
                [59, null, null, { name: 'Belt of Incredible Dexterity +2', price: 4000 }],
                [60, null, null, { name: 'Belt of Mighty Constitution +2', price: 4000 }],
                [61, null, null, { name: 'Bracers of Armor +2', price: 4000 }],
                [62, null, null, { name: 'Cloak of Resistance +2', price: 4000 }],
                [63, null, null, { name: 'Gloves of Arrow Snaring', price: 4000 }],
                [64, null, null, { name: 'Headband of Alluring Charisma +2', price: 4000 }],
                [65, null, null, { name: 'Headband of Inspired Wisdom +2', price: 4000 }],
                [66, null, null, { name: 'Headband of Vast Intelligence +2', price: 4000 }],
                [67, null, null, { name: 'Ioun Stone, Clear Spindle', price: 4000 }],
                [68, null, null, { name: 'Restorative Ointment', price: 4000 }],
                [69, null, null, { name: 'Marvelous Pigments', price: 4000 }],
                [70, null, null, { name: 'Pearl of Power, 2nd-level Spell', price: 4000 }],
                [71, null, null, { name: 'Stone Salve', price: 4000 }],
                [72, null, null, { name: 'Necklace of Fireballs Type III', price: 4350 }],
                [73, null, null, { name: 'Circlet of Persuasion', price: 4500 }],
                [74, null, null, { name: 'Slippers of Spider Climbing', price: 4800 }],
                [75, null, null, { name: 'Incense of Meditation', price: 4900 }],
                [76, null, null, { name: 'Amulet of Mighty Fists +1', price: 5000 }],
                [77, null, null, { name: 'Bag of Holding Type II', price: 5000 }],
                [78, null, null, { name: 'Bracers of Archery, Lesser', price: 5000 }],
                [79, null, null, { name: 'Ioun Stone, Dusty Rose Prism', price: 5000 }],
                [80, null, null, { name: 'Helm of Comprehend Languages And Read Magic', price: 5200 }],
                [81, null, null, { name: 'Vest of Escape', price: 5200 }],
                [82, null, null, { name: 'Eversmoking Bottle', price: 5400 }],
                [83, null, null, { name: 'Sustaining Spoon', price: 5400 }],
                [84, null, null, { name: 'Necklace of Fireballs Type IV', price: 5400 }],
                [85, null, null, { name: 'Boots of Striding And Springing', price: 5500 }],
                [86, null, null, { name: 'Wind Fan', price: 5500 }],
                [87, null, null, { name: 'Necklace of Fireballs Type V', price: 5850 }],
                [88, null, null, { name: 'Horseshoes of A Zephyr', price: 6000 }],
                [89, null, null, { name: 'Pipes of Haunting', price: 6000 }],
                [90, null, null, { name: 'Gloves of Swimming And Climbing', price: 6250 }],
                [91, null, null, { name: 'Crown of Blasting, Minor', price: 6480 }],
                [92, null, null, { name: 'Horn of Goodness/Evil', price: 6500 }],
                [93, null, null, { name: 'Robe of Useful Items', price: 7000 }],
                [94, null, null, { name: 'Boat, Folding', price: 7200 }],
                [95, null, null, { name: 'Cloak of the Manta Ray', price: 7200 }],
                [96, null, null, { name: 'Bottle of Air', price: 7250 }],
                [97, null, null, { name: 'Bag of Holding Type III', price: 7400 }],
                [98, null, null, { name: 'Periapt of Health', price: 7400 }],
                [99, null, null, { name: 'Boots of Levitation', price: 7500 }],
                [100, null, null, { name: 'Harp of Charming', price: 7500 }],
                [null, 1, null, { name: 'Amulet of Natural Armor +2', price: 8000 }],
                [null, 2, null, { name: 'Golem Manual, Flesh', price: 8000 }],
                [null, 3, null, { name: 'Hand of Glory', price: 8000 }],
                [null, 4, null, { name: 'Ioun Stone, Deep Red Sphere', price: 8000 }],
                [null, 5, null, { name: 'Ioun Stone, Incandescent Blue Sphere', price: 8000 }],
                [null, 6, null, { name: 'Ioun Stone, Pale Blue Rhomboid', price: 8000 }],
                [null, 7, null, { name: 'Ioun Stone, Pink And Green Sphere', price: 8000 }],
                [null, 8, null, { name: 'Ioun Stone, Pink Rhomboid', price: 8000 }],
                [null, 9, null, { name: 'Ioun Stone, Scarlet And Blue Sphere', price: 8000 }],
                [null, 10, null, { name: 'Deck of Illusions', price: 8100 }],
                [null, 11, null, { name: 'Necklace of Fireballs Type VI', price: 8100 }],
                [null, 12, null, { name: 'Candle of Invocation', price: 8400 }],
                [null, 13, null, { name: 'Robe of Blending', price: 8400 }],
                [null, 14, null, { name: 'Bag of Tricks, Rust', price: 8500 }],
                [null, 15, null, { name: 'Necklace of Fireballs Type VII', price: 8700 }],
                [null, 16, null, { name: 'Bracers of Armor +3', price: 9000 }],
                [null, 17, null, { name: 'Cloak of Resistance +3', price: 9000 }],
                [null, 18, null, { name: 'Decanter of Endless Water', price: 9000 }],
                [null, 19, null, { name: 'Necklace of Adaptation', price: 9000 }],
                [null, 20, null, { name: 'Pearl of Power, 3rd-level Spell', price: 9000 }],
                [null, 21, null, { name: 'Figurine of Wondrous Power, Serpentine Owl', price: 9100 }],
                [null, 22, null, { name: 'Strand of Prayer Beads, Lesser', price: 9600 }],
                [null, 23, null, { name: 'Bag of Holding Type IV', price: 10000 }],
                [null, 24, null, { name: 'Belt of Physical Might +2', price: 10000 }],
                [null, 25, null, { name: 'Figurine of Wondrous Power, Bronze Griffon', price: 10000 }],
                [null, 26, null, { name: 'Figurine of Wondrous Power, Ebony Fly', price: 10000 }],
                [null, 27, null, { name: 'Glove of Storing', price: 10000 }],
                [null, 28, null, { name: 'Headband of Mental Prowess +2', price: 10000 }],
                [null, 29, null, { name: 'Ioun Stone, Dark Blue Rhomboid', price: 10000 }],
                [null, 30, null, { name: 'Cape of the Mountebank', price: 10080 }],
                [null, 31, null, { name: 'Phylactery of Negative Channeling', price: 11000 }],
                [null, 32, null, { name: 'Phylactery of Positive Channeling', price: 11000 }],
                [null, 33, null, { name: 'Gauntlet of Rust', price: 11500 }],
                [null, 34, null, { name: 'Boots of Speed', price: 12000 }],
                [null, 35, null, { name: 'Goggles of Night', price: 12000 }],
                [null, 36, null, { name: 'Golem Manual, Clay', price: 12000 }],
                [null, 37, null, { name: 'Medallion of Thoughts', price: 12000 }],
                [null, 38, null, { name: 'Blessed Book', price: 12500 }],
                [null, 39, null, { name: 'Gem of Brightness', price: 13000 }],
                [null, 40, null, { name: 'Lyre of Building', price: 13000 }],
                [null, 41, null, { name: 'Robe, Monk\'s', price: 13000 }],
                [null, 42, null, { name: 'Cloak of Arachnida', price: 14000 }],
                [null, 43, null, { name: 'Belt of Dwarvenkind', price: 14900 }],
                [null, 44, null, { name: 'Periapt of Wound Closure', price: 15000 }],
                [null, 45, null, { name: 'Pearl of the Sirines', price: 15300 }],
                [null, 46, null, { name: 'Figurine of Wondrous Power, Onyx Dog', price: 15500 }],
                [null, 47, null, { name: 'Bag of Tricks, Tan', price: 16000 }],
                [null, 48, null, { name: 'Belt of Giant Strength +4', price: 16000 }],
                [null, 49, null, { name: 'Belt of Incredible Dexterity +4', price: 16000 }],
                [null, 50, null, { name: 'Belt of Mighty Constitution +4', price: 16000 }],
                [null, 51, null, { name: 'Belt of Physical Perfection +2', price: 16000 }],
                [null, 52, null, { name: 'Boots, Winged', price: 16000 }],
                [null, 53, null, { name: 'Bracers of Armor +4', price: 16000 }],
                [null, 54, null, { name: 'Cloak of Resistance +4', price: 16000 }],
                [null, 55, null, { name: 'Headband of Alluring Charisma +4', price: 16000 }],
                [null, 56, null, { name: 'Headband of Inspired Wisdom +4', price: 16000 }],
                [null, 57, null, { name: 'Headband of Mental Superiority +2', price: 16000 }],
                [null, 58, null, { name: 'Headband of Vast Intelligence +4', price: 16000 }],
                [null, 59, null, { name: 'Pearl of Power, 4th-level Spell', price: 16000 }],
                [null, 60, null, { name: 'Scabbard of Keen Edges', price: 16000 }],
                [null, 61, null, { name: 'Figurine of Wondrous Power, Golden Lions', price: 16500 }],
                [null, 62, null, { name: 'Chime of Interruption', price: 16800 }],
                [null, 63, null, { name: 'Broom of Flying', price: 17000 }],
                [null, 64, null, { name: 'Figurine of Wondrous Power, Marble Elephant', price: 17000 }],
                [null, 65, null, { name: 'Amulet of Natural Armor +3', price: 18000 }],
                [null, 66, null, { name: 'Ioun Stone, Iridescent Spindle', price: 18000 }],
                [null, 67, null, { name: 'Bracelet of Friends', price: 19000 }],
                [null, 68, null, { name: 'Amulet of Mighty Fists +2', price: 20000 }],
                [null, 69, null, { name: 'Carpet of Flying, 5 ft. By 5 ft.', price: 20000 }],
                [null, 70, null, { name: 'Horn of Blasting', price: 20000 }],
                [null, 71, null, { name: 'Ioun Stone, Pale Lavender Ellipsoid', price: 20000 }],
                [null, 72, null, { name: 'Ioun Stone, Pearly White Spindle', price: 20000 }],
                [null, 73, null, { name: 'Portable Hole', price: 20000 }],
                [null, 74, null, { name: 'Stone of Good Luck (luckstone)', price: 20000 }],
                [null, 75, null, { name: 'Figurine of Wondrous Power, Ivory Goats', price: 21000 }],
                [null, 76, null, { name: 'Rope of Entanglement', price: 21000 }],
                [null, 77, null, { name: 'Golem Manual, Stone', price: 22000 }],
                [null, 78, null, { name: 'Mask of the Skull', price: 22000 }],
                [null, 79, null, { name: 'Mattock of the Titans', price: 23348 }],
                [null, 80, null, { name: 'Crown of Blasting, Major', price: 23760 }],
                [null, 81, null, { name: 'Cloak of Displacement, Minor', price: 24000 }],
                [null, 82, null, { name: 'Helm of Underwater Action', price: 24000 }],
                [null, 83, null, { name: 'Bracers of Archery, Greater', price: 25000 }],
                [null, 84, null, { name: 'Bracers of Armor +5', price: 25000 }],
                [null, 85, null, { name: 'Cloak of Resistance +5', price: 25000 }],
                [null, 86, null, { name: 'Eyes of Doom', price: 25000 }],
                [null, 87, null, { name: 'Pearl of Power, 5th-level Spell', price: 25000 }],
                [null, 88, null, { name: 'Maul of the Titans', price: 25305 }],
                [null, 89, null, { name: 'Cloak of the Bat', price: 26000 }],
                [null, 90, null, { name: 'Iron Bands of Binding', price: 26000 }],
                [null, 91, null, { name: 'Cube of Frost Resistance', price: 27000 }],
                [null, 92, null, { name: 'Helm of Telepathy', price: 27000 }],
                [null, 93, null, { name: 'Periapt of Proof Against Poison', price: 27000 }],
                [null, 94, null, { name: 'Robe of Scintillating Colors', price: 27000 }],
                [null, 95, null, { name: 'Manual of Bodily Health +1', price: 27500 }],
                [null, 96, null, { name: 'Manual of Gainful Exercise +1', price: 27500 }],
                [null, 97, null, { name: 'Manual of Quickness in Action +1', price: 27500 }],
                [null, 98, null, { name: 'Tome of Clear Thought +1', price: 27500 }],
                [null, 99, null, { name: 'Tome of Leadership And Influence +1', price: 27500 }],
                [null, 100, null, { name: 'Tome of Understanding +1', price: 27500 }],
                [null, null, 1, { name: 'Dimensional Shackles', price: 28000 }],
                [null, null, 2, { name: 'Figurine of Wondrous Power, Obsidian Steed', price: 28500 }],
                [null, null, 3, { name: 'Drums of Panic', price: 30000 }],
                [null, null, 4, { name: 'Ioun Stone, Orange Prism', price: 30000 }],
                [null, null, 5, { name: 'Ioun Stone, Pale Green Prism', price: 30000 }],
                [null, null, 6, { name: 'Lantern of Revealing', price: 30000 }],
                [null, null, 7, { name: 'Amulet of Natural Armor +4', price: 32000 }],
                [null, null, 8, { name: 'Amulet of Proof Against Detection And Location', price: 35000 }],
                [null, null, 9, { name: 'Carpet of Flying, 5 ft. By 10 ft.', price: 35000 }],
                [null, null, 10, { name: 'Golem Manual, Iron', price: 35000 }],
                [null, null, 11, { name: 'Belt of Giant Strength +6', price: 36000 }],
                [null, null, 12, { name: 'Belt of Incredible Dexterity +6', price: 36000 }],
                [null, null, 13, { name: 'Belt of Mighty Constitution +6', price: 36000 }],
                [null, null, 14, { name: 'Bracers of Armor +6', price: 36000 }],
                [null, null, 15, { name: 'Headband of Alluring Charisma +6', price: 36000 }],
                [null, null, 16, { name: 'Headband of Inspired Wisdom +6', price: 36000 }],
                [null, null, 17, { name: 'Headband of Vast Intelligence +6', price: 36000 }],
                [null, null, 18, { name: 'Ioun Stone, Vibrant Purple Prism', price: 36000 }],
                [null, null, 19, { name: 'Pearl of Power, 6th-level Spell', price: 36000 }],
                [null, null, 20, { name: 'Scarab of Protection', price: 38000 }],
                [null, null, 21, { name: 'Belt of Physical Might +4', price: 40000 }],
                [null, null, 22, { name: 'Headband of Mental Prowess +4', price: 40000 }],
                [null, null, 23, { name: 'Ioun Stone, Lavender And Green Ellipsoid', price: 40000 }],
                [null, null, 24, { name: 'Ring Gates', price: 40000 }],
                [null, null, 25, { name: 'Crystal Ball', price: 42000 }],
                [null, null, 26, { name: 'Golem Manual, Stone Guardian', price: 44000 }],
                [null, null, 27, { name: 'Amulet of Mighty Fists +3', price: 45000 }],
                [null, null, 28, { name: 'Strand of Prayer Beads', price: 45800 }],
                [null, null, 29, { name: 'Orb of Storms', price: 48000 }],
                [null, null, 30, { name: 'Boots of Teleportation', price: 49000 }],
                [null, null, 31, { name: 'Bracers of Armor +7', price: 49000 }],
                [null, null, 32, { name: 'Pearl of Power, 7th-level Spell', price: 49000 }],
                [null, null, 33, { name: 'Amulet of Natural Armor +5', price: 50000 }],
                [null, null, 34, { name: 'Cloak of Displacement, Major', price: 50000 }],
                [null, null, 35, { name: 'Crystal Ball With See Invisibility', price: 50000 }],
                [null, null, 36, { name: 'Horn of Valhalla', price: 50000 }],
                [null, null, 37, { name: 'Crystal Ball With Detect Thoughts', price: 51000 }],
                [null, null, 38, { name: 'Wings of Flying', price: 54000 }],
                [null, null, 39, { name: 'Cloak of Etherealness', price: 55000 }],
                [null, null, 40, { name: 'Instant Fortress', price: 55000 }],
                [null, null, 41, { name: 'Manual of Bodily Health +2', price: 55000 }],
                [null, null, 42, { name: 'Manual of Gainful Exercise +2', price: 55000 }],
                [null, null, 43, { name: 'Manual of Quickness in Action +2', price: 55000 }],
                [null, null, 44, { name: 'Tome of Clear Thought +2', price: 55000 }],
                [null, null, 45, { name: 'Tome of Leadership And Influence +2', price: 55000 }],
                [null, null, 46, { name: 'Tome of Understanding +2', price: 55000 }],
                [null, null, 47, { name: 'Eyes of Charming', price: 56000 }],
                [null, null, 48, { name: 'Robe of Stars', price: 58000 }],
                [null, null, 49, { name: 'Carpet of Flying, 10 ft. By 10 ft.', price: 60000 }],
                [null, null, 50, { name: 'Darkskull', price: 60000 }],
                [null, null, 51, { name: 'Cube of Force', price: 62000 }],
                [null, null, 52, { name: 'Belt of Physical Perfection +4', price: 64000 }],
                [null, null, 53, { name: 'Bracers of Armor +8', price: 64000 }],
                [null, null, 54, { name: 'Headband of Mental Superiority +4', price: 64000 }],
                [null, null, 55, { name: 'Pearl of Power, 8th-level Spell', price: 64000 }],
                [null, null, 56, { name: 'Crystal Ball With Telepathy', price: 70000 }],
                [null, null, 57, { name: 'Horn of Blasting, Greater', price: 70000 }],
                [null, null, 58, { name: 'Pearl of Power, Two Spells', price: 70000 }],
                [null, null, 59, { name: 'Helm of Teleportation', price: 73500 }],
                [null, null, 60, { name: 'Gem of Seeing', price: 75000 }],
                [null, null, 61, { name: 'Robe of the Archmagi', price: 75000 }],
                [null, null, 62, { name: 'Mantle of Faith', price: 76000 }],
                [null, null, 63, { name: 'Amulet of Mighty Fists +4', price: 80000 }],
                [null, null, 64, { name: 'Crystal Ball With True Seeing', price: 80000 }],
                [null, null, 65, { name: 'Pearl of Power, 9th-level Spell', price: 81000 }],
                [null, null, 66, { name: 'Well of Many Worlds', price: 82000 }],
                [null, null, 67, { name: 'Manual of Bodily Health +3', price: 82500 }],
                [null, null, 68, { name: 'Manual of Gainful Exercise +3', price: 82500 }],
                [null, null, 69, { name: 'Manual of Quickness in Action +3', price: 82500 }],
                [null, null, 70, { name: 'Tome of Clear Thought +3', price: 82500 }],
                [null, null, 71, { name: 'Tome of Leadership And Influence +3', price: 82500 }],
                [null, null, 72, { name: 'Tome of Understanding +3', price: 82500 }],
                [null, null, 73, { name: 'Apparatus of the Crab', price: 90000 }],
                [null, null, 74, { name: 'Belt of Physical Might +6', price: 90000 }],
                [null, null, 75, { name: 'Headband of Mental Prowess +6', price: 90000 }],
                [null, null, 76, { name: 'Mantle of Spell Resistance', price: 90000 }],
                [null, null, 77, { name: 'Mirror of Opposition', price: 92000 }],
                [null, null, 78, { name: 'Strand of Prayer Beads, Greater', price: 95800 }],
                [null, null, 79, { name: 'Manual of Bodily Health +4', price: 110000 }],
                [null, null, 80, { name: 'Manual of Gainful Exercise +4', price: 110000 }],
                [null, null, 81, { name: 'Manual of Quickness in Action +4', price: 110000 }],
                [null, null, 82, { name: 'Tome of Clear Thought +4', price: 110000 }],
                [null, null, 83, { name: 'Tome of Leadership And Influence +4', price: 110000 }],
                [null, null, 84, { name: 'Tome of Understanding +4', price: 110000 }],
                [null, null, 85, { name: 'Amulet of the Planes', price: 120000 }],
                [null, null, 86, { name: 'Robe of Eyes', price: 120000 }],
                [null, null, 87, { name: 'Amulet of Mighty Fists +5', price: 125000 }],
                [null, null, 88, { name: 'Helm of Brilliance', price: 125000 }],
                [null, null, 89, { name: 'Manual of Bodily Health +5', price: 137500 }],
                [null, null, 90, { name: 'Manual of Gainful Exercise +5', price: 137500 }],
                [null, null, 91, { name: 'Manual of Quickness in Action +5', price: 137500 }],
                [null, null, 92, { name: 'Tome of Clear Thought +5', price: 137500 }],
                [null, null, 93, { name: 'Tome of Leadership And Influence +5', price: 137500 }],
                [null, null, 94, { name: 'Tome of Understanding +5', price: 137500 }],
                [null, null, 95, { name: 'Belt of Physical Perfection +6', price: 144000 }],
                [null, null, 96, { name: 'Headband of Mental Superiority +6', price: 144000 }],
                [null, null, 97, { name: 'Efreeti Bottle', price: 145000 }],
                [null, null, 98, { name: 'Cubic Gate', price: 164000 }],
                [null, null, 99, { name: 'Iron Flask', price: 170000 }],
                [null, null, 100, { name: 'Mirror of Life Trapping', price: 200000 }]
            ]
        },

        'Advanced Player\'s Guide': {

            'Specific Armour': [
                [null, 20, 02, { name: 'Mistmail', price: 2250, plus: 1 }],
                [null, 35, 05, { name: 'Soothsayer\'s Raiment', price: 10300, plus: 1 }],
                [null, 50, 06, { name: 'Boneless Leather', price: 12160, plus: 1 }],
                [null, 65, 07, { name: 'Murderer\'s Blackcloth', price: 12405, plus: 1 }],
                [null, 90, 12, { name: 'Folding Plate', price: 12650, plus: 1 }],
                [null, 100, 27, { name: 'Armor of Insults', price: 16175, plus: 1 }],
                [null, null, 42, { name: 'Buccaneer\'s Breastplate', price: 23850, plus: 1 }],
                [null, null, 49, { name: 'Forsaken Banded Mail', price: 25400, plus: 1 }],
                [null, null, 61, { name: 'Gianthide Armor (Ogre)', price: 39165, plus: 3 }],
                [null, null, 71, { name: 'Gianthide Armor (Hill Giant)', price: 46665, plus: 3 }],
                [null, null, 81, { name: 'Gianthide Armor (Stone Giant)', price: 54165, plus: 3 }],
                [null, null, 86, { name: 'Gianthide Armor (Fire Giant)', price: 54165, plus: 3 }],
                [null, null, 91, { name: 'Gianthide Armor (Frost Giant)', price: 54165, plus: 3 }],
                [null, null, 96, { name: 'Gianthide Armor (Troll)', price: 59165, plus: 3 }],
                [null, null, 97, { name: 'Gianthide Armor (Cloud Giant)', price: 69165, plus: 3 }],
                [null, null, 98, { name: 'Gianthide Armor (Storm Giant)', price: 76665, plus: 3 }],
                [null, null, 100, { name: 'Daystar Halfplate', price: 81250, plus: 1 }],
            ],

            'Specific Shield': [
                [null, null, 50, { name: 'Battlement Shield', price: 16180, plus: 2 }],
                [null, null, 100, { name: 'Fortress Shield', price: 19180, plus: 1 }]
            ],

            'Armour Qualities': [
                [40, 35, 19, { name: 'Champion', plus: 1 }],
                [80, 66, 37, { name: 'Dastard', plus: 1 }],
                [99, 70, 39, { name: 'Jousting', price: 3750 }],
                [null, 83, 61, { name: 'Righteous', price: 27000 }],
                [null, 96, 80, { name: 'Unrighteous', price: 27000 }],
                [null, 99, 90, { name: 'Determination', price: 30000 }],
                [100, 100, 100, '@rollTwice']
            ],

            'Specific Weapons': [
                [35, null, null, { name: 'Dustburst Bullet', price: 196, plus: 1, isAmmo: true }],
                [70, null, null, { name: 'Tangle Bolt', price: 226, plus: 2, isAmmo: true }],
                [80, 7, null, { name: 'Searing Arrow', price: 1516, plus: 2, isAmmo: true }],
                [90, 14, null, { name: 'Sizzling Arrow', price: 1516, plus: 2, isAmmo: true }],
                [100, 26, null, { name: 'Lance of Jousting', price: 4310, plus: 1 }],
                [null, 41, null, { name: 'Boulderhead Mace', price: 6812, plus: 1 }],
                [null, 53, null, { name: 'Beaststrike Club', price: 7300, plus: 1 }],
                [null, 60, 04, { name: 'Trident of Stability', price: 9815, plus: 1 }],
                [null, 70, 20, { name: 'Blade of Binding', price: 12350, plus: 1 }],
                [null, 79, 37, { name: 'Shieldsplitter Lance', price: 18310, plus: 2 }],
                [null, 87, 62, { name: 'Ricochet Hammer', price: 20301, plus: 2 }],
                [null, 95, 82, { name: 'Sparkwake Starknife', price: 21324, plus: 2, isRanged: true }],
                [null, 100, 88, { name: 'Undercutting Axe', price: 23310, plus: 2 }],
                [null, null, 94, { name: 'Spirit Blade', price: 48502, plus: 4 }],
                [null, null, 100, { name: 'Guarding Blade', price: 65310, plus: 5 }],
            ],

            'Melee Weapon Qualities': [
                [12, 04, 03, { name: 'Allying', plus: 1 }],
                [24, 12, 08, { name: 'Conductive', plus: 1 }],
                [36, 22, 20, { name: 'Corrosive', plus: 1 }],
                [48, 32, 29, { name: 'Cunning', plus: 1 }],
                [58, 40, 38, { name: 'Furious', plus: 1 }],
                [70, 49, 47, { name: 'Grayflame', plus: 1 }],
                [77, 58, 56, { name: 'Huntsman', plus: 1 }],
                [84, 67, 65, { name: 'Jurist', plus: 1 }],
                [99, 74, 74, { name: 'Menacing', plus: 1 }],
                [null, 82, 81, { name: 'Corrosive burst', plus: 2 }],
                [null, 89, 85, { name: 'Dueling', price: 14000 }],
                [null, 95, 90, { name: 'Transformative', price: 10000 }],
                [100, 100, 100, '@rollTwice']
            ],

            'Ranged Weapon Qualities': [
                [15, 14, 13, { name: 'Allying', plus: 1 }],
                [30, 28, 26, { name: 'Conductive', plus: 1 }],
                [48, 48, 42, { name: 'Corrosive', plus: 1 }],
                [60, 58, 56, { name: 'Cunning', plus: 1 }],
                [72, 69, 65, { name: 'Huntsman', plus: 1 }],
                [94, 91, 87, { name: 'Jurist', plus: 1 }],
                [99, 95, 90, { name: 'Corrosive burst', plus: 2 }],
                [100, 100, 100, '@rollTwice']
            ],

            'Rings': [
                [10, null, null, { name: 'Dungeon Ring, Prisoner\'s', price: 250 }],
                [40, null, null, { name: 'Arcane Signets', price: 1000 }],
                [80, 25, null, { name: 'Ring of Maniacal Devices', price: 5000 }],
                [95, 46, null, { name: 'Ring of Delayed Doom (1 Stone)', price: 5000 }],
                [100, 52, null, { name: 'Ring of Forcefangs', price: 8000 }],
                [null, 59, null, { name: 'Ring of Revelation, Lesser', price: 10000 }],
                [null, 70, 02, { name: 'Ring of Delayed Doom (2 Stones)', price: 10000 }],
                [null, 80, 11, { name: 'Ring of Delayed Doom (3 Stones)', price: 15000 }],
                [null, 85, 29, { name: 'Ring of Retribution', price: 15000 }],
                [null, 90, 35, { name: 'Dungeon Ring, Jailer\'s', price: 16000 }],
                [null, 96, 38, { name: 'Ring of Revelation, Greater', price: 16000 }],
                [null, 98, 68, { name: 'Ring of Delayed Doom (4 Stones)', price: 20000 }],
                [null, 99, 69, { name: 'Ring of Revelation, Superior', price: 24000 }],
                [null, 100, 85, { name: 'Ring of Delayed Doom (5 Stones)', price: 25000 }],
                [null, null, 93, { name: 'Ring of Delayed Doom (6 Stones)', price: 30000 }],
                [null, null, 97, { name: 'Ring of Delayed Doom (7 Stones)', price: 35000 }],
                [null, null, 99, { name: 'Ring of Delayed Doom (8 Stones)', price: 40000 }],
                [null, null, 100, { name: 'Ring of Delayed Doom (9 Stones)', price: 45000 }],
            ],

            'Rods': [
                [null, 03, null, { name: 'Metamagic Rod, Merciful, Lesser', price: 1500 }],
                [null, 06, null, { name: 'Metamagic Rod, Disruptive, Lesser', price: 3000 }],
                [null, 11, null, { name: 'Metamagic Rod, Ectoplasmic, Lesser', price: 3000 }],
                [null, 21, null, { name: 'Metamagic Rod, Elemental, Lesser', price: 3000 }],
                [null, 27, null, { name: 'Metamagic Rod, Focused, Lesser', price: 3000 }],
                [null, 33, null, { name: 'Metamagic Rod, Intensified, Lesser', price: 3000 }],
                [null, 36, null, { name: 'Metamagic Rod, Lingering, Lesser', price: 3000 }],
                [null, 39, null, { name: 'Metamagic Rod, Persistent, Lesser', price: 3000 }],
                [null, 43, null, { name: 'Metamagic Rod, Reach, Lesser', price: 3000 }],
                [null, 53, null, { name: 'Metamagic Rod, Selective, Lesser', price: 3000 }],
                [null, 55, null, { name: 'Metamagic Rod, Merciful', price: 5500 }],
                [null, 58, null, { name: 'Metamagic Rod, Bouncing, Lesser', price: 9000 }],
                [null, 62, null, { name: 'Metamagic Rod, Sickening, Lesser', price: 9000 }],
                [null, 66, null, { name: 'Metamagic Rod, Thundering, Lesser', price: 9000 }],
                [null, 70, 03, { name: 'Metamagic Rod, Disruptive', price: 11000 }],
                [null, 74, 09, { name: 'Metamagic Rod, Ectoplasmic', price: 11000 }],
                [null, 80, 20, { name: 'Metamagic Rod, Elemental', price: 11000 }],
                [null, 83, 28, { name: 'Metamagic Rod, Focused', price: 11000 }],
                [null, 86, 36, { name: 'Metamagic Rod, Intensified', price: 11000 }],
                [null, 88, 39, { name: 'Metamagic Rod, Lingering', price: 11000 }],
                [null, 90, 43, { name: 'Metamagic Rod, Persistent', price: 11000 }],
                [null, 93, 46, { name: 'Metamagic Rod, Reach', price: 11000 }],
                [null, 97, 54, { name: 'Metamagic Rod, Selective', price: 11000 }],
                [null, 98, 56, { name: 'Metamagic Rod, Merciful, Greater', price: 12250 }],
                [null, 100, 58, { name: 'Metamagic Rod, Dazing, Lesser', price: 14000 }],
                [null, null, 60, { name: 'Metamagic Rod, Disruptive, Greater', price: 24500 }],
                [null, null, 63, { name: 'Metamagic Rod, Ectoplasmic, Greater', price: 24500 }],
                [null, null, 69, { name: 'Metamagic Rod, Elemental, Greater', price: 24500 }],
                [null, null, 73, { name: 'Metamagic Rod, Focused, Greater', price: 24500 }],
                [null, null, 77, { name: 'Metamagic Rod, Intensified, Greater', price: 24500 }],
                [null, null, 79, { name: 'Metamagic Rod, Lingering, Greater', price: 24500 }],
                [null, null, 80, { name: 'Metamagic Rod, Persistent, Greater', price: 24500 }],
                [null, null, 82, { name: 'Metamagic Rod, Reach, Greater', price: 24500 }],
                [null, null, 86, { name: 'Metamagic Rod, Selective, Greater', price: 24500 }],
                [null, null, 89, { name: 'Metamagic Rod, Bouncing', price: 32500 }],
                [null, null, 91, { name: 'Metamagic Rod, Sickening', price: 32500 }],
                [null, null, 93, { name: 'Metamagic Rod, Thundering', price: 32500 }],
                [null, null, 95, { name: 'Metamagic Rod, Dazing', price: 54000 }],
                [null, null, 97, { name: 'Metamagic Rod, Bouncing, Greater', price: 73000 }],
                [null, null, 98, { name: 'Metamagic Rod, Sickening, Greater', price: 73000 }],
                [null, null, 99, { name: 'Metamagic Rod, Thundering, Greater', price: 73000 }],
                [null, null, 100, { name: 'Metamagic Rod, Dazing, Greater', price: 121500 }],
            ],

            'Staves': [
                [null, 02, 01, { name: 'Staff of Toxins', price: 12600 }],
                [null, 05, 02, { name: 'Staff of Journeys', price: 13600 }],
                [null, 10, 04, { name: 'Staff of Rigor', price: 13600 }],
                [null, 18, 08, { name: 'Staff of Shrieking', price: 14400 }],
                [null, 25, 11, { name: 'Staff of Souls', price: 16400 }],
                [null, 35, 16, { name: 'Staff of Stealth', price: 18400 }],
                [null, 42, 20, { name: 'Staff of Revelations', price: 20400 }],
                [null, 54, 26, { name: 'Staff of Bolstering', price: 20800 }],
                [null, 59, 28, { name: 'Staff of Traps', price: 21200 }],
                [null, 69, 35, { name: 'Staff of Cackling Wrath', price: 23600 }],
                [null, 76, 44, { name: 'Staff of Obstacles', price: 25800 }],
                [null, 82, 54, { name: 'Staff of Performance', price: 26800 }],
                [null, 86, 60, { name: 'Staff of Hoarding', price: 30016 }],
                [null, 92, 72, { name: 'Staff of Slumber', price: 34050 }],
                [null, 95, 83, { name: 'Staff of Vision', price: 41250 }],
                [null, 98, 91, { name: 'Staff of Weather', price: 44200 }],
                [null, 100, 100, { name: 'Staff of Many Rays', price: 52800 }],
            ],

            'Wondrous Items': [
                [05, null, null, { name: 'Ioun Torch', price: 75 }],
                [09, null, null, { name: 'War Paint of the Terrible Visage', price: 100 }],
                [12, null, null, { name: 'Assisting Glove', price: 180 }],
                [15, null, null, { name: 'Bandages of Rapid Recovery', price: 200 }],
                [18, null, null, { name: 'Catching Cape', price: 200 }],
                [20, null, null, { name: 'Soul Soap', price: 200 }],
                [23, null, null, { name: 'Bottle of Messages', price: 300 }],
                [27, null, null, { name: 'Key of Lock Jamming', price: 400 }],
                [29, null, null, { name: 'Campfire Bead', price: 720 }],
                [35, null, null, { name: 'Defoliant Polish', price: 800 }],
                [39, null, null, { name: 'Dust of Emulation', price: 800 }],
                [42, null, null, { name: 'Muleback Cords', price: 1000 }],
                [45, null, null, { name: 'All Tools Vest', price: 1800 }],
                [49, null, null, { name: 'Cowardly Crouching Cloak', price: 1800 }],
                [56, null, null, { name: 'Scabbard of Vigor', price: 1800 }],
                [58, null, null, { name: 'Clamor Box', price: 2000 }],
                [61, null, null, { name: 'Glowing Glove', price: 2000 }],
                [63, null, null, { name: 'Manacles of Cooperation', price: 2000 }],
                [70, null, null, { name: 'Knight\'s Pennon (Honor)', price: 2200 }],
                [75, null, null, { name: 'Flying Ointment', price: 2250 }],
                [78, null, null, { name: 'Boots of Friendly Terrain', price: 2400 }],
                [80, null, null, { name: 'Apple of Eternal Sleep', price: 2500 }],
                [83, null, null, { name: 'Cauldron of Brewing', price: 3000 }],
                [85, null, null, { name: 'Philter of Love', price: 3000 }],
                [88, null, null, { name: 'Sash of the War Champion', price: 4000 }],
                [90, null, null, { name: 'Knight\'s Pennon (Battle)', price: 4500 }],
                [92, null, null, { name: 'Knight\'s Pennon (Parley)', price: 4500 }],
                [94, null, null, { name: 'Helm of Fearsome Mien', price: 5000 }],
                [96, null, null, { name: 'Horn of the Huntmaster', price: 5000 }],
                [98, null, null, { name: 'Scabbard of Staunching', price: 5000 }],
                [100, null, null, { name: 'Sheath of Bladestealth', price: 5000 }],
                [null, 06, null, { name: 'Grappler\'s Mask', price: 5000 }],
                [null, 16, null, { name: 'Torc of Lionheart Fury', price: 8000 }],
                [null, 19, null, { name: 'Amulet of Spell Cunning', price: 10000 }],
                [null, 23, null, { name: 'Construct Channel Brick', price: 10000 }],
                [null, 25, null, { name: 'Doomharp', price: 10000 }],
                [null, 27, null, { name: 'Ki Mat', price: 10000 }],
                [null, 37, null, { name: 'Lord\'s Banner (Swiftness)', price: 10000 }],
                [null, 40, null, { name: 'Crystal of Healing Hands', price: 12000 }],
                [null, 44, null, { name: 'Book of the Loremaster', price: 15000 }],
                [null, 48, null, { name: 'Bracelet of Mercy', price: 15000 }],
                [null, 56, null, { name: 'Cauldron of Plenty', price: 15000 }],
                [null, 61, null, { name: 'Gloves of Dueling', price: 15000 }],
                [null, 64, null, { name: 'Necklace of Ki Serenity', price: 16000 }],
                [null, 69, null, { name: 'Robes of Arcane Heritage', price: 16000 }],
                [null, 74, null, { name: 'Silver Smite Bracelet', price: 16000 }],
                [null, 82, null, { name: 'Vest of the Cockroach', price: 16000 }],
                [null, 86, null, { name: 'Amulet of Magecraft', price: 20000 }],
                [null, 90, null, { name: 'Horn of Antagonism', price: 20000 }],
                [null, 93, null, { name: 'Moon Circlet', price: 20000 }],
                [null, 96, null, { name: 'Necromancer\'s Athame', price: 20000 }],
                [null, 98, null, { name: 'Sniper Goggles', price: 20000 }],
                [null, 100, null, { name: 'Annihilation Spectacles', price: 25000 }],
                [null, null, 08, { name: 'Cauldron of the Dead', price: 30000 }],
                [null, null, 20, { name: 'Mask of Giants (Lesser)', price: 30000 }],
                [null, null, 32, { name: 'Cauldron of Resurrection', price: 33000 }],
                [null, null, 48, { name: 'Cauldron of Flying', price: 40000 }],
                [null, null, 64, { name: 'Cauldron of seeing', price: 42000 }],
                [null, null, 76, { name: 'Lord\'s Banner (Terror)', price: 56000 }],
                [null, null, 88, { name: 'Lord\'s Banner (Victory)', price: 75000 }],
                [null, null, 96, { name: 'Mask of Giants (Greater)', price: 90000 }],
                [null, null, 100, { name: 'Lord\'s Banner (Crusades)', price: 100000 }],
            ]
        }
    },

    chooseBookTable: function (itemType, column) {
        var hits = 0;
        var choice = null;
        $.each(this.magicItemData, $.proxy(function (book) {
            // TODO check if we want to include that book
            var table = this.magicItemData[book][itemType];
            if (table) {
                // select book proportional to # of available items
                var itemCount = 0;
                for (var row = 0; row < table.length; row++) {
                    if (table[row][column] != null) {
                        itemCount++;
                    }
                }
                if (itemCount > 0) {
                    hits += itemCount;
                    if (Math.random() * hits < itemCount) {
                        choice = book;
                    }
                }
            }
        }, this));
        if (!choice) {
            throw 'No book has items of type ' + itemType;
        } else {
            return this.magicItemData[choice][itemType];
        }
    },

    toMagicItem: function(tableRow) {
        var classification = tableRow[0] ? 'Minor' : tableRow[1] ? 'Medium' : 'Major';
        return new $.kingdom.MagicItem(classification, tableRow[3]);
    },

    chooseItem: function (column, itemType) {
        if (column == 'minor') {
            column = 0;
        } else if (column == 'medium') {
            column = 1;
        } else if (column == 'major') {
            column = 2;
        }
        if (!itemType) {
            itemType = 'Start';
        }
        var table = this.chooseBookTable(itemType, column);
        var roll = parseInt(100 * Math.random()) + 1;
        var row = 0;
        while (table[row][column] == null || table[row][column] < roll) {
            row++;
        }
        var result = table[row];
        if ($.type(result[3]) != 'string') {
            return this.toMagicItem(result);
        } else if (result[3].indexOf('@') == 0) {
            var func = this.itemFunctions[result[3]];
            return $.proxy(func, this)(column, itemType);
        } else {
            return this.chooseItem(column, result[3]);
        }
    },

    addArmourShieldQuality: function (column, table) {
        var baseItem = this.chooseItem(column, table);
        var itemType = baseItem.isShield ? 'Shield Qualities' : 'Armour Qualities';
        return this.addQuality(column, itemType, 1000, baseItem);
    },

    addWeaponQuality: function (column, table) {
        var baseItem = this.chooseItem(column, table);
        if (baseItem.noQualities) {
            return baseItem;
        }
        if (baseItem.isAmmo) {
            baseItem.price *= 50;
            baseItem.isRanged = true;
        } else if (baseItem.name.indexOf(' Random Weapon') >= 0) {
            if (Math.random() < 0.3) {
                baseItem.name = baseItem.name.replace(' Weapon', ' Ranged Weapon');
                baseItem.isRanged = true;
            } else {
                baseItem.name = baseItem.name.replace(' Weapon', ' Melee Weapon');
            }
        }
        var itemType = baseItem.isRanged ? 'Ranged Weapon Qualities' : 'Melee Weapon Qualities';
        var result = this.addQuality(column, itemType, 2000, baseItem);
        if (baseItem.isAmmo) {
            result.price /= 50;
        }
        return result;
    },

    addQuality: function(column, itemType, plusFactor, baseItem) {
        var quality = this.chooseItem(column, itemType);
        while (quality.type && quality.type.intersect(baseItem.type)) {
            quality = this.chooseItem(column, itemType);
        }
        if (baseItem.plus == 0) {
            baseItem.name += ' +1';
            baseItem.plus = 1;
            baseItem.price += plusFactor;
        }
        if (quality.plus) {
            var plus = baseItem.plus + quality.plus;
            if (plus > 10) {
                return baseItem;
            }
            baseItem.price += (plus*plus - baseItem.plus*baseItem.plus)*plusFactor;
            baseItem.plus = plus;
        }
        if (quality.price) {
            baseItem.price += quality.price;
        }
        baseItem.name = quality.name + ' ' + baseItem.name;
        baseItem.type = (baseItem.type || '') + (quality.type || ('|' + quality.name + '|'));
        if (baseItem.plus <= 2) {
            baseItem.classification = 'Minor'
        } else if (baseItem.plus <= 4) {
            baseItem.classification = 'Medium'
        } else {
            baseItem.classification = 'Major'
        }
        return baseItem;
    },

    rollTwice: function(column, table) {
        var quality1 = this.chooseItem(column, table);
        var quality2 = this.chooseItem(column, table);
        while (quality1.type && quality1.type.intersect(quality2.type)) {
            if (quality2.plus > quality1.plus || quality2.price > quality1.price) {
                quality1 = quality2;
            }
            quality2 = this.chooseItem(column, table);
        }
        if (quality2.plus) {
            quality1.plus = (quality1.plus || 0) + quality2.plus;
        }
        if (quality2.price) {
            quality1.price = (quality1.price || 0) + quality2.price;
        }
        quality1.name = quality2.name + ' ' + quality1.name;
        quality1.type = (quality1.type || ('|' + quality1.name + '|')) + (quality2.type || ('|' + quality2.name + '|'));
        return quality1;
    }
});

$.kingdom.MagicItemSource.prototype.itemFunctions = {
    '@rollTwice': $.kingdom.MagicItemSource.prototype.rollTwice,
    '@addArmourShieldQuality': $.kingdom.MagicItemSource.prototype.addArmourShieldQuality,
    '@addWeaponQuality': $.kingdom.MagicItemSource.prototype.addWeaponQuality
};

// ====================== Resource class ======================

$.kingdom.Resource = Class.create({

    idPrefix: 'resource.',

    statList: ['Economy', 'Loyalty', 'Stability'],

    init: function (kingdom, index) {
        this.kingdom = kingdom;
        this.stats = {};
        this.index = index;
        this.description = this.kingdom.getChoice(this.getId('description'), '');
        $.each(this.statList, $.proxy(function (index, name) {
            this.stats[name] = parseInt(this.kingdom.getChoice(this.getId(name), 0));
        }, this));
    },

    getId: function (field) {
        field = field || '';
        return this.idPrefix + this.index + '.' + field;
    },

    setDescription: function (newDescription) {
        this.kingdom.setChoice(this.getId('description'), newDescription);
        this.description = newDescription;
    },

    setStat: function (statName, strValue) {
        var value = parseInt(strValue);
        this.stats[statName] = value;
        this.kingdom.setChoice(this.getId(statName), value);
    },

    getStat: function (statName) {
        return this.stats[statName];
    },

    apply: function () {
        $.each(this.statList, $.proxy(function (index, name) {
            if (this.stats[name])
                this.kingdom.modify(name, this.stats[name], "Other");
        }, this));
    },

    renumber: function (newIndex) {
        var oldId = this.getId('');
        if (newIndex >= 0) {
            this.index = newIndex;
            this.kingdom.changeId(oldId, this.getId(''));
        } else
            this.kingdom.changeId(oldId, '', true);
    }

});

// ====================== ResourceTable class ======================

$.kingdom.ResourceTable = Class.create({
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

    resetSheet: function () {
        this.resources = [];
        this.resourcesTable.empty();
    },

    addResourceHandler: function (evt) {
        this.addResource(this.resources.length, true);
    },

    addCell: function (row, text, editCallback) {
        var cell = $('<td></td>');
        if (text)
            cell.text(text);
        cell.makeEditable($.proxy(editCallback, this));
        row.append(cell);
        return cell;
    },

    addResource: function (index, editNameImmediately) {
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

    finishEditingDescription: function (element, newValue, oldValue) {
        newValue = newValue.trim();
        var index = $(element).parent().index();
        if (!newValue && oldValue) {
            var answer = confirm("Really delete resource \"" + oldValue + "\"?");
            if (!answer) {
                element.text(oldValue);
                return;
            }
        }
        if (!newValue) {
            $(element).parent().remove();
            this.resources[index].renumber(-1);
            for (++index; index < this.resources.length; ++index) {
                this.resources[index].renumber(index - 1);
                this.resources[index - 1] = this.resources[index];
            }
            this.resources.splice(this.resources.length - 1, 1);
            this.kingdom.setChoice(this.resourceCountId, this.resources.length);
        } else
            this.resources[index].setDescription(newValue);
    },

    finishEditingStat: function (element, stat, newValue) {
        var index = $(element).parent().index();
        this.resources[index].setStat(stat, newValue);
    },

    finishEditingEconomy: function (element, newValue) {
        this.finishEditingStat(element, 'Economy', newValue);
    },

    finishEditingLoyalty: function (element, newValue) {
        this.finishEditingStat(element, 'Loyalty', newValue);
    },

    finishEditingStability: function (element, newValue) {
        this.finishEditingStat(element, 'Stability', newValue);
    },

    apply: function () {
        $.each(this.resources, $.proxy(function (index, resource) {
            resource.apply();
        }, this));
    }

});

// ====================== Army class ======================

$.kingdom.Army = Class.create({

    idPrefix: 'army.',

    statList: ['Creatures', 'Size', 'ACR', 'DV', 'OM', 'Speed', 'Consumption', 'Active', 'Morale', 'Hitpoints', 'Notes'],

    init: function (kingdom, index) {
        this.kingdom = kingdom;
        this.stats = {};
        this.index = index;
        this.name = this.kingdom.getChoice(this.getId('name'), '');
        $.each(this.statList, $.proxy(function (index, name) {
            this.stats[name] = this.kingdom.getChoice(this.getId(name), 0);
        }, this));
    },

    getId: function (field) {
        field = field || '';
        return this.idPrefix + this.index + '.' + field;
    },

    setName: function (newName) {
        this.kingdom.setChoice(this.getId('name'), newName);
        this.name = newName;
    },

    setStat: function (statName, value) {
        this.stats[statName] = value;
        this.kingdom.setChoice(this.getId(statName), value);
    },

    getStat: function (statName) {
        return this.stats[statName];
    },

    apply: function () {
	var consumption = parseInt(this.stats['Consumption']) || 0;
	if (this.stats['Active'] == "true")
	    consumption *= 4;
        this.kingdom.modify("Consumption", consumption, "Armies");
    },

    renumber: function (newIndex) {
        var oldId = this.getId('');
        if (newIndex >= 0) {
            this.index = newIndex;
            this.kingdom.changeId(oldId, this.getId(''));
        } else
            this.kingdom.changeId(oldId, '', true);
    }

});


// ====================== ArmyTable class ======================

$.kingdom.ArmyTable = Class.create({
    armyCountId: 'armyCount',

    init: function (kingdom) {
        this.kingdom = kingdom;
        this.armies = [];
        this.armiesTable = $('.armies tbody');
        this.armiesTable.empty();
        // load anything stored in kingdom
        var max = parseInt(this.kingdom.getChoice(this.armyCountId, 0));
        var index;
        for (index = 0; index < max; ++index)
            this.addArmy(index);
        $('#addArmyButton').click($.proxy(this.addArmyHandler, this));
    },

    resetSheet: function () {
        this.armies = [];
        this.armiesTable.empty();
    },

    addArmyHandler: function (evt) {
        this.addArmy(this.armies.length, true);
    },

    addCheckboxCell: function (row, value, changeCallback) {
        var cell = $('<td></td>');
	var checkbox = $('<input type="checkbox"/>');
	cell.append(checkbox);
	checkbox.prop('checked', value == "true");
	checkbox.change(changeCallback);
        row.append(cell);
        return cell;
    },

    addSelectCell: function (row, text, options, editCallback) {
        var cell = $('<td></td>');
	var select = $('<select></select>');
	$.each(options, function (index, value) {
	    var option = $('<option></option>');
	    option.text(value);
	    if (value == text) {
		option.prop('selected', true);
	    }
	    select.append(option);
	});
	select.change(editCallback);
	cell.append(select);
        row.append(cell);
        return cell;
    },

    addCell: function (row, text, editCallback) {
        var cell = $('<td></td>');
        if (text)
            cell.text(text);
        cell.makeEditable(editCallback);
        row.append(cell);
        return cell;
    },

    addArmy: function (index, editNameImmediately) {
        var army = new $.kingdom.Army(this.kingdom, index);
        this.armies.push(army);
        var newRow = $('<tr></tr>');
        var nameCell = this.addCell(newRow, army.name, $.proxy(this.finishEditingName, this));
        $.each(army.statList, $.proxy(function (index, stat) {
	    if (stat == 'Active') {
		this.addCheckboxCell(newRow, army.getStat(stat), $.proxy(this.finishEditingActive, this));
	    } else if (stat == 'Size') {
		this.addSelectCell(newRow, army.getStat(stat), [ 'Fine', 'Diminutive', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal' ], $.proxy(this.finishEditingSize, this));
	    } else {
		this.addCell(newRow, army.getStat(stat), $.proxy(this.finishEditingStat, this, stat));
	    }
        }, this));
        this.armiesTable.append(newRow);
        this.kingdom.setChoice(this.armyCountId, this.armies.length);
        if (editNameImmediately)
            nameCell.click();
    },

    finishEditingName: function (element, newValue, oldValue) {
        newValue = newValue.trim();
        var index = $(element).parent().index();
        if (!newValue && oldValue) {
            var answer = confirm("Really delete army \"" + oldValue + "\"?");
            if (!answer) {
                element.text(oldValue);
                return;
            }
        }
        if (!newValue) {
            $(element).parent().remove();
            this.armies[index].renumber(-1);
            for (++index; index < this.armies.length; ++index) {
                this.armies[index].renumber(index - 1);
                this.armies[index - 1] = this.armies[index];
            }
            this.armies.splice(this.armies.length - 1, 1);
            this.kingdom.setChoice(this.armyCountId, this.armies.length);
        } else
            this.armies[index].setName(newValue);
    },

    finishEditingStat: function (stat, element, newValue) {
        var index = $(element).parent().index();
        this.armies[index].setStat(stat, newValue);
    },

    finishEditingSize: function (evt) {
	var element = $(evt.target);
        var index = element.parent().parent().index();
        this.armies[index].setStat('Size', element.val());
    },

    finishEditingActive: function (evt) {
	var checkbox = $(evt.target);
        var index = checkbox.parent().parent().index();
        this.armies[index].setStat('Active', checkbox.prop('checked') ? "true" : "false");
    },

    apply: function () {
        $.each(this.armies, $.proxy(function (index, army) {
            army.apply();
        }, this));
    }

});


// ====================== Calendar class ======================

$.kingdom.Calendar = Class.create({

    init: function (kingdom) {
        this.kingdom = kingdom;
        this.year = this.kingdom.getChoice('calendarYear', 4712);
        this.month = this.kingdom.getChoice('calendarMonth', 2);
        this.monthNames = this.kingdom.getArrayChoice('monthNames', [ 'Abadius', 'Calistril', 'Pharast', 'Gozran', 'Desnus', 'Sarenith', 'Erastus', 'Arodus', 'Rova', 'Lamashan', 'Neth', 'Kuthona' ]);
        this.seasons = this.kingdom.getArrayChoice('seasons', [ 'Winter 2', 'Winter 3', 'Spring 1', 'Spring 2', 'Spring 3', 'Summer 1', 'Summer 2', 'Summer 3', 'Autumn 1', 'Autumn 2', 'Autumn 3', 'Winter 1' ]);
        $('.calendarMinus').click($.proxy(this.minus, this));
        $('.calendarPlus').click($.proxy(this.plus, this));
        this.refresh();
    },

    refresh: function () {
        $('.calendar').text(this.toString());
    },

    toString: function () {
        return this.monthNames[this.month] + ' ' + this.year + ' (' + this.seasons[this.month] + ')';
    },

    minus: function () {
        this.month--;
        if (this.month < 0) {
            this.year--;
            this.month = this.monthNames.length;
        }
        this.save();
        this.refresh();
        this.kingdom.newTurn();
    },

    plus: function () {
        this.month++;
        if (this.month >= this.monthNames.length) {
            this.year++;
            this.month = 0;
        }
        this.save();
        this.refresh();
        this.kingdom.newTurn();
    },

    save: function () {
        this.kingdom.setChoice('calendarYear', this.year);
        this.kingdom.setChoice('calendarMonth', this.month);
        this.kingdom.setChoice('monthNames', this.monthNames);
        this.kingdom.setChoice('seasons', this.seasons);
    }

});

// ====================== Handle titles in touch devices ======================

if (isTouchDevice()) {
    $(document).on('click', '[title]', function (e) {
        var titleDiv = $('#titleDiv');
        var title = $(this).attr('title').replace(/\n/g, '<br/>');
        titleDiv.html(title);
        titleDiv.show();
        titleDiv.css({ 'left': e.pageX - 20, 'top': e.pageY - 20 });
        $(document).on('click.touchDevice', function(e) {
            if (titleDiv.is(':visible')) {
                titleDiv.hide();
                e.stopImmediatePropagation();
                e.preventDefault();
                $(document).off('click.touchDevice');
            }
        });
    });
}

// ====================== Initialise! ======================

$(document).ready(function () {

    new $.kingdom.KingdomManager();

});
