/**	Perform standard point buy method for character abilities.
 */
 
export class PointBuy {
	actor = null;
	dlg = null;

	racialBonus = {
	  Strength: 0,
	  Dexterity: 0,
	  Constitution: 0,
	  Intelligence: 0,
	  Wisdom: 0,
	  Charisma: 0,
	};
	choose = "";


	calcCost(html) {
		let usedPoints = 0;
		for (const ability in this.abilities) {
		  const baseValue = parseInt(html.find(`#${ability}`).val());
		  const racialBonus = parseInt(html.find(`[name="racial${ability}"]`).val());
		  const newValue = baseValue + racialBonus;
		  usedPoints += this.pointCosts[baseValue];
		  html.find(`#total${ability}`).text(newValue);
		  this.abilities[ability] = newValue;
		}
		html.find("#remainingPoints").text(this.totalPoints - usedPoints);
		return usedPoints;
	}
	
	genSelect(ability, total) {
		let value = total - this.racialBonus[ability];
		let content = `<tr>
		<td style="text-align: left">
			<label for="${ability}">${ability}</label>
		</td>
		<td style="text-align: center">
			<select id="${ability}">`;
		for (let i = 8; i <= 15; i++) {
			if (value == i)
				content += `<option value="${i}" selected>${i}</option>`;
			else
				content += `<option value="${i}">${i}</option>`;
		}
		return content + `</select>
			</td>
			<td width="20" style="text-align: center">
				<input type="number" name="racial${ability}" value="${this.racialBonus[ability]}" width="20" size=1 maxlength=1>
			</td>
			<td style="text-align: center; font-weight: bold" id="total${ability}">
				${total}
			</td>
			</tr>
		`;
	}

	pointCosts = {
	  8: 0,
	  9: 1,
	  10: 2,
	  11: 3,
	  12: 4,
	  13: 5,
	  14: 7,
	  15: 9,
	};

	abilities = {
	  Strength: 8,
	  Dexterity: 8,
	  Constitution: 8,
	  Intelligence: 8,
	  Wisdom: 8,
	  Charisma: 8,
	};

	totalPoints = Number(game.settings.get('point-buy', 'budget'));

	createDialog(actor) {
		this.actor = actor;

		if (actor.system.details.level > 1) {
			Dialog.prompt({
				title: "Character Level Too High",
				content: `<p>Only level 1 characters can use Point Buy to set abilities.</p>
				<p>${actor.name} is level ${actor.system.details.level}</p>`,
				label: "OK"
			});
			return;
		}

		let race = this.actor.items.filter(it => it.type == 'race');
		let prepend;

		if (race.length == 0) {
			prepend = `<p>There is no race on this character.</p>`;
		} else {
			race = race[0];
			prepend = `<p><b>${race.name}</b>`;
			let delim = ': ';
			let abilities = race.system.advancement.filter(it => it.type == "AbilityScoreImprovement");
			if (abilities.length == 0) {
				prepend += delim + `ability score improvement data missing`;
			} else {
				abilities = abilities[0];
				for (let abil in abilities.value.assignments) {
					let a;
					switch (abil) {
					case 'str':
						a = 'Strength';
						break;
					case 'dex':
						a = 'Dexterity';
						break;
					case 'con':
						a = 'Constitution';
						break;
					case 'int':
						a = 'Intelligence';
						break;
					case 'wis':
						a = 'Wisdom';
						break;
					case 'cha':
						a = 'Charisma';
						break;
					}
					let val = abilities.value.assignments[abil];
					this.racialBonus[a] += val;
					prepend += delim + `${a}: ${val}`;
					delim = ', ';
				}
			}
			prepend += `</p>\n`;
		}
		
		this.abilities['Strength'] = actor.system.abilities.str.value;
		this.abilities['Dexterity'] = actor.system.abilities.dex.value;
		this.abilities['Constitution'] = actor.system.abilities.con.value;
		this.abilities['Intelligence'] = actor.system.abilities.int.value;
		this.abilities['Wisdom'] = actor.system.abilities.wis.value;
		this.abilities['Charisma'] = actor.system.abilities.cha.value;

		let strengthStr = this.genSelect('Strength', actor.system.abilities.str.value);
		let dexterityStr = this.genSelect('Dexterity', actor.system.abilities.dex.value);
		let constitutionStr = this.genSelect('Constitution', actor.system.abilities.con.value);
		let intelligenceStr = this.genSelect('Intelligence', actor.system.abilities.int.value);
		let wisdomStr = this.genSelect('Wisdom', actor.system.abilities.wis.value);
		let charismaStr = this.genSelect('Charisma', actor.system.abilities.cha.value);
		
		let content = `${prepend}
			<form>
			  <p>Each ability costs a number of points. You have a total of ${this.totalPoints} points to spend. Racial bonuses can reduce the cost of abilities.</p>
			  <p><strong>Ability Costs</strong> 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9</p>`;
		if (this.choose)
			content += `<p>${this.choose}</p>`;
		content +=
			  `<p>Remaining Points: <span id="remainingPoints">${this.totalPoints}</span></p>
			  <table>
				<tr>
					<th style="text-align: left">Ability</th>
					<th>Base Value</th>
					<th>Racial Bonus</th>
					<th>Ability Total</th>
				</tr>
				${strengthStr}
				${dexterityStr}
				${constitutionStr}
				${intelligenceStr}
				${wisdomStr}
				${charismaStr}
			  </table>
			</form>
		  `;
		
		function handleRender(pb, html) {
			pb.calcCost(html);
			html.on('change', html, (e) => {
				let html = e.data;
				switch (e.target.nodeName) {
				case 'INPUT':
					pb.calcCost(html);
					break;
				case 'SELECT':
					// Dropdown changed.
					pb.calcCost(html);
					break;
				}
			});
		}

		this.dlg = new Dialog({
		  title: "Point Buy Ability Scores",
		  content: content,
		  buttons: {
			ok: {
			  label: "OK",
			  callback: (html) => {

				let usedPoints = this.calcCost(html);

				// Check if the point allocation is valid

				if (usedPoints == this.totalPoints) {
				  actor.update({"data.abilities.str.value": this.abilities['Strength']});
				  actor.update({"data.abilities.dex.value": this.abilities['Dexterity']});
				  actor.update({"data.abilities.con.value": this.abilities['Constitution']});
				  actor.update({"data.abilities.int.value": this.abilities['Intelligence']});
				  actor.update({"data.abilities.wis.value": this.abilities['Wisdom']});
				  actor.update({"data.abilities.cha.value": this.abilities['Charisma']});

				} else {
				  // Show an error message if the point allocation is invalid
				  throw new Error(`You need to spend exactly ${this.totalPoints} points. You spent ${usedPoints}.`);
				}
			  },
			},
			cancel: {
			  label: "Cancel",
			},
		  },
		  default: "ok",
		  render: (html) => { handleRender(this, html); }
		});
		this.dlg.render(true);
	}
	
	finish() {
		// console.log(`point-buy | Finished setting abilities for ${this.actor.name}`);
	}

	static {
		// console.log("point-buy | Point Buy Calculator character filter loaded.");

		Hooks.on("init", function() {
		  //console.log("point-buy | Point Buy Calculator initialized.");
		});

		Hooks.on("ready", function() {
		  //console.log("point-buy | Point Buy Calculator ready to accept game data.");
		});
	}
}


/*
 * Create the configuration settings.
 */
Hooks.once('init', async function () {
	game.settings.register('point-buy', 'budget', {
	  name: 'Points available for abilities',
	  hint: 'This is the number of points available for buying abilities.',
	  scope: 'client',     // "world" = sync to db, "client" = local storage
	  config: true,       // false if you dont want it to show in module config
	  type: Number,       // Number, Boolean, String, Object
	  default: 27,
	  onChange: value => { // value is the new value of the setting
		//console.log('point-buy | budget: ' + value)
	  }
	});
	
});

function insertActorHeaderButtons(actorSheet, buttons) {
  let actor = actorSheet.object;
  buttons.unshift({
    label: "Point Buy Calculator",
    icon: "fas fa-calculator",
    class: "point-buy-button",
    onclick: async () => {
		let pb = null;
		try {
			pb = new PointBuy();
			if (!await pb.createDialog(actor))
				return false;
		} catch (msg) {
			ui.notifications.warn(msg);
		} finally {
			if (pb)
				pb.finish();
		}

    }
  });
}

Hooks.on("getActorSheetHeaderButtons", insertActorHeaderButtons);
