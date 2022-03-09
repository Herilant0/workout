'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // km
    this.duration = duration; // min
  }

  _setDescritpion() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type
      .slice(1)
      .toLowerCase()} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running'; // instead of doing this in the construtor this.type = 'running'

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);

    this.cadence = cadence;
    this.calcPace();
    this._setDescritpion();
  }

  calcPace() {
    //min/km, rythme
    this.pace = this.duration / this.distance;

    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);

    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescritpion();
  }

  calcSpeed() {
    // Km/h
    this.speed = this.distance / (this.duration / 60);

    return this.speed;
  }
}

// const run1 = new Running([23, -12], 2, 10, 190);
// const cycling1 = new Cycling([53, -12], 9, 10, 590);

// console.log(run1);
// console.log(cycling1);

////////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const resetAll = document.querySelector('.reset');
const handleMovement = document.querySelector('.movement');

// sorting workout
const sortWorkout = document.querySelector('.sort');
const inputWorkoutType = document.querySelector('.sort__input--type');

const movement = document.querySelector('.movement');

class App {
  #map;
  #zoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition();

    //load data from localStorage
    this._getLocalStorage();

    // modify the workout
    this._getSingleWorkout();

    // delete single workout
    this._deleteSingleWorkout();

    // sorting workout
    sortWorkout.addEventListener('change', this._sortingWorkout.bind(this));

    // Attach event handler
    // form.addEventListener('submit', this._newWorkout.bind(this));

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (form.hasAttribute('data-updated')) return;
      this._newWorkout(e);
    });

    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    // Delete all workouts
    resetAll.addEventListener('click', this.reset);
  }

  _sortingWorkout() {
    const sortType = inputWorkoutType.value;
    containerWorkouts.innerHTML = '';

    if (sortType === 'distance') {
      const sortByDistance = this.#workouts
        .slice()
        .sort((a, b) => b.distance - a.distance);

      // update UI
      sortByDistance.forEach(workout => this._updateUI(workout));
    }

    if (sortType === 'duration') {
      const sortByDuration = this.#workouts
        .slice()
        .sort((a, b) => b.duration - a.duration);

      // update UI
      sortByDuration.forEach(workout => this._updateUI(workout));
    }
  }

  _updateUI(workout) {
    this.#workouts.length !== 0 && movement.classList.remove('hidden');

    containerWorkouts.insertAdjacentHTML('afterbegin', this._useUI(workout));
  }

  _useUI(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
      `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
          <div class="editing">
            <svg xmlns="http://www.w3.org/2000/svg" fill="#ffffff" viewBox="0 0 512 512"><!--! Font Awesome Pro 6.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d="M362.7 19.32C387.7-5.678 428.3-5.678 453.3 19.32L492.7 58.75C517.7 83.74 517.7 124.3 492.7 149.3L444.3 197.7L314.3 67.72L362.7 19.32zM421.7 220.3L188.5 453.4C178.1 463.8 165.2 471.5 151.1 475.6L30.77 511C22.35 513.5 13.24 511.2 7.03 504.1C.8198 498.8-1.502 489.7 .976 481.2L36.37 360.9C40.53 346.8 48.16 333.9 58.57 323.5L291.7 90.34L421.7 220.3z"/></svg>
          </div>
          <div class="deleting">
            <svg
              class="delete"
              fill="#ef4444"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 576 512"
            >
              <path
                d="M576 384C576 419.3 547.3 448 512 448H205.3C188.3 448 172 441.3 160 429.3L9.372 278.6C3.371 272.6 0 264.5 0 256C0 247.5 3.372 239.4 9.372 233.4L160 82.75C172 70.74 188.3 64 205.3 64H512C547.3 64 576 92.65 576 128V384zM271 208.1L318.1 256L271 303C261.7 312.4 261.7 327.6 271 336.1C280.4 346.3 295.6 346.3 304.1 336.1L352 289.9L399 336.1C408.4 346.3 423.6 346.3 432.1 336.1C442.3 327.6 442.3 312.4 432.1 303L385.9 256L432.1 208.1C442.3 199.6 442.3 184.4 432.1 175C423.6 165.7 408.4 165.7 399 175L352 222.1L304.1 175C295.6 165.7 280.4 165.7 271 175C261.7 184.4 261.7 199.6 271 208.1V208.1z"
              />
            </svg>
          </div>
        </li>
        `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
          <div class="editing">
            <svg xmlns="http://www.w3.org/2000/svg" fill="#ffffff" viewBox="0 0 512 512"><!--! Font Awesome Pro 6.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d="M362.7 19.32C387.7-5.678 428.3-5.678 453.3 19.32L492.7 58.75C517.7 83.74 517.7 124.3 492.7 149.3L444.3 197.7L314.3 67.72L362.7 19.32zM421.7 220.3L188.5 453.4C178.1 463.8 165.2 471.5 151.1 475.6L30.77 511C22.35 513.5 13.24 511.2 7.03 504.1C.8198 498.8-1.502 489.7 .976 481.2L36.37 360.9C40.53 346.8 48.16 333.9 58.57 323.5L291.7 90.34L421.7 220.3z"/></svg>
          </div>
          <div class="deleting">
            <svg
              class="delete"
              fill="#ef4444"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 576 512"
            >
              <path
                d="M576 384C576 419.3 547.3 448 512 448H205.3C188.3 448 172 441.3 160 429.3L9.372 278.6C3.371 272.6 0 264.5 0 256C0 247.5 3.372 239.4 9.372 233.4L160 82.75C172 70.74 188.3 64 205.3 64H512C547.3 64 576 92.65 576 128V384zM271 208.1L318.1 256L271 303C261.7 312.4 261.7 327.6 271 336.1C280.4 346.3 295.6 346.3 304.1 336.1L352 289.9L399 336.1C408.4 346.3 423.6 346.3 432.1 336.1C442.3 327.6 442.3 312.4 432.1 303L385.9 256L432.1 208.1C442.3 199.6 442.3 184.4 432.1 175C423.6 165.7 408.4 165.7 399 175L352 222.1L304.1 175C295.6 165.7 280.4 165.7 271 175C261.7 184.4 261.7 199.6 271 208.1V208.1z"
              />
            </svg>
          </div>
        </li>
        `;

    return html;
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your current position');
        }
      );
  }

  _loadMap(position) {
    // console.log(position);

    const { latitude, longitude } = position.coords;

    // console.log(latitude, longitude);
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    // console.log(this);
    this.#map = L.map('map').setView(coords, this.#zoomLevel); // "L", namespaces
    // console.log(map);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // handling click on map
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => this._renderWorkoutMarker(work)); // when map is load add marker
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // get data from input
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if workout is running, create object running
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('please, put a positive numbers');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if workout is cycling, create object cycling
    if (type === 'cycling') {
      const elevation = +inputElevation.value; //might be negative number

      //check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('please, put a positive numbers');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // add new  object to workout
    this.#workouts.push(workout);
    // console.log(workout);

    // render workout in map as marker
    this._renderWorkoutMarker(workout);

    // render workout on list
    // this._renderWorkout(workout);
    this._updateUI(workout);

    // hide form + clear input field
    this._hideForm();

    //set my workout to localStorage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  // _renderWorkout(workout) {
  //   this._updateUI(workout);
  // }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#zoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // workin in public interface
    // workout.click();
    // console.log(workout);
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => this._updateUI(work));
  }

  _deleteSingleWorkout() {
    containerWorkouts.addEventListener('click', e => {
      if (!e.target.closest('.deleting')) return;
      const key = e.target.closest('.workout').dataset.id;

      if (!key) return;
      // console.log(key);

      this.#workouts = this.#workouts.filter(w => w.id !== key);
      containerWorkouts.innerHTML = '';

      // update ui
      this.#workouts.forEach(workout => this._updateUI(workout));

      // set to localStorage
      this._setLocalStorage();
    });
  }

  _updatedWorkout(workout) {
    form.addEventListener('submit', () => {
      let updatedWorkout;

      const upType = inputType.value;
      const upDistance = +inputDistance.value;
      const upDuration = +inputDuration.value;

      // Checking input
      const validInput = (...inputs) => inputs.every(nb => Number.isFinite(nb));
      const checkPositive = (...inputs) => inputs.every(input => input > 0);

      // update the description
      const updatedDescription = (type, desc) => {
        return `${type.replace(type[0], type[0].toUpperCase())}${desc.slice(
          -11
        )}`;
      };

      if (upType === 'running') {
        const upCadence = +inputCadence.value;

        if (
          !validInput(upDistance, upDuration, upCadence) ||
          !checkPositive(upDistance, upDuration, upCadence)
        )
          return alert(`Please verify your input`);

        updatedWorkout = {
          cadence: upCadence,
          clicks: workout.clicks,
          coords: workout.coords,
          date: workout.date,
          description: updatedDescription(upType, workout.description),
          distance: upDistance,
          duration: upDuration,
          id: workout.id,
          pace: upDuration / upDistance,
          type: upType,
        };
      }

      if (upType === 'cycling') {
        const upElevation = +inputElevation.value;

        if (
          !validInput(upDistance, upDuration, upElevation) ||
          !checkPositive(upDistance, upDuration)
        )
          return alert(`Please verify your input`);

        updatedWorkout = {
          elevationGain: upElevation,
          clicks: workout.clicks,
          coords: workout.coords,
          date: workout.date,
          description: updatedDescription(upType, workout.description),
          distance: upDistance,
          duration: upDuration,
          id: workout.id,
          speed: upDistance / (upDuration / 60),
          type: upType,
        };
      }

      // updated workout
      this.#workouts = this.#workouts.filter(w => w.id !== workout.id);
      this.#workouts.push(updatedWorkout);

      //render workout updated
      containerWorkouts.innerHTML = '';
      this.#workouts.forEach(wk => this._updateUI(wk));

      // send to localStorage
      this._setLocalStorage();

      // hide form & delete attributes
      form.removeAttribute('data-updated');
      this._hideForm();
    });
  }

  // initialize workout to form
  _initUpdateForm = wk => {
    inputType.value = wk.type;
    inputDistance.value = wk.distance;
    inputDistance.focus();
    inputDuration.value = wk.duration;

    if (wk.type === 'running') {
      // hard check class for corresponding workout
      inputElevation.closest('.form__row').classList.add('form__row--hidden');
      inputCadence.closest('.form__row').classList.remove('form__row--hidden');

      inputCadence.value = wk.cadence;
    }

    if (wk.type === 'cycling') {
      // hard check class for corresponding workout
      inputCadence.closest('.form__row').classList.add('form__row--hidden');
      inputElevation
        .closest('.form__row')
        .classList.remove('form__row--hidden');

      inputElevation.value = wk.elevationGain;
    }
  };

  _getSingleWorkout() {
    containerWorkouts.addEventListener('click', e => {
      if (!e.target.closest('.editing')) return;

      const key = e.target.closest('.workout').dataset.id;

      if (!key) return;
      // updateForm.classList.remove('hidden');
      form.classList.remove('hidden');
      form.setAttribute('data-updated', 'ready');

      const workout = this.#workouts.find(w => w.id === key);
      // console.log(workout);

      // initialize data from input by corresponding workout
      this._initUpdateForm(workout);

      if (!form.hasAttribute('data-updated')) return;

      // save updated form
      this._updatedWorkout(workout);
    });
  }

  reset() {
    if (confirm('Delete all workouts')) {
      localStorage.removeItem('workouts');
      location.reload(); // reload the page;
    }
  }
}

const app = new App();
// console.log(app.__proto__);

const fakeWorkouts = [
  {
    date: '2022-03-06T08:09:54.860Z',
    id: '6554194860',
    clicks: 0,
    coords: [-18.85219849074212, 47.52994537353516],
    distance: 2,
    duration: 12,
    type: 'running',
    cadence: 32,
    pace: 6,
    description: 'Running on March 6',
  },
  {
    date: '2022-03-06T08:10:09.539Z',
    id: '6554209539',
    clicks: 0,
    coords: [-18.869255151707524, 47.534751892089844],
    distance: 5,
    duration: 25,
    type: 'cycling',
    elevationGain: 32,
    speed: 12,
    description: 'Cycling on March 6',
  },
  {
    date: '2022-03-06T08:10:24.589Z',
    id: '6554224589',
    clicks: 0,
    coords: [-18.861458036213758, 47.485485076904304],
    distance: 5,
    duration: 60,
    type: 'cycling',
    elevationGain: 15,
    speed: 5,
    description: 'Cycling on March 6',
  },
  {
    date: '2022-03-06T08:10:36.659Z',
    id: '6554236659',
    clicks: 0,
    coords: [-18.88728459215798, 47.478446960449226],
    distance: 3,
    duration: 50,
    type: 'running',
    cadence: 15,
    pace: 16.666666666666668,
    description: 'Running on March 6',
  },
  {
    date: '2022-03-06T08:10:48.322Z',
    id: '6554248322',
    clicks: 0,
    coords: [-18.906286495910905, 47.541099702274224],
    distance: 5,
    duration: 120,
    type: 'running',
    cadence: 15,
    pace: 24,
    description: 'Running on March 6',
  },
  {
    date: '2022-03-06T08:11:04.504Z',
    id: '6554264504',
    clicks: 0,
    coords: [-18.8197048120737, 47.56031979941022],
    distance: 1,
    duration: 25,
    type: 'running',
    cadence: 15,
    pace: 25,
    description: 'Running on March 6',
  },
];

// console.log(JSON.stringify(fakeWorkouts));
