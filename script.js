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

const list = document.querySelectorAll('.editing');

class App {
  #map;
  #zoomLevel = 13;
  #mapEvent;
  #workouts = [];

  final = ['workout'];

  constructor() {
    this._getPosition();

    //load data from localStorage
    this._getLocalStorage();

    // modify the workout
    this._updateWorkout();

    // delete single workout
    this._deleteSingleWorkout();

    // Attach event handler
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    resetAll.addEventListener('click', this.reset);
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
    this._renderWorkout(workout);

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

  _renderWorkout(workout) {
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

    form.insertAdjacentHTML('afterend', html);
  }

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
    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  _deleteSingleWorkout() {
    // document.querySelectorAll('.deleting').forEach(workout =>
    //   workout.addEventListener('click', e => {
    //     // console.log(this._getKey(e));
    //     const data = JSON.parse(localStorage.getItem('workouts')).filter(
    //       w => w.id !== this._getKey(e)
    //     );
    //     localStorage.setItem('workouts', JSON.stringify(data));
    //   })
    // );
  }

  _updateWorkout() {
    containerWorkouts.addEventListener('click', function (e) {
      const edit = e.target.closest('.editing');
      const data = JSON.parse(localStorage.getItem('workouts'));

      const validInput = (...inputs) =>
        inputs.every(input => Number.isFinite(input));
      const checkPositive = (...inputs) => inputs.every(input => input > 0);

      const updateForm = `
        <form class="update">
          <div class="form__row">
            <label class="form__label">Type</label>
            <select class="update__input update__input--type">
              <option value="running">Running</option>
              <option value="cycling">Cycling</option>
            </select>
          </div>
          <div class="form__row">
            <label class="form__label">Distance</label>
            <input class="update__input update__input--distance" placeholder="km" />
          </div>
          <div class="form__row">
            <label class="form__label">Duration</label>
            <input
              class="update__input update__input--duration"
              placeholder="min"
            />
          </div>
          <div class="form__row">
            <label class="form__label">Cadence</label>
            <input
              class="update__input update__input--cadence"
              placeholder="step/min"
            />
          </div>
          <div class="form__row form__row--hidden">
            <label class="form__label">Elev Gain</label>
            <input
              class="update__input update__input--elevation"
              placeholder="meters"
            />
          </div>
          <button class="form__btn">OK</button>
        </form>
      `;

      if (!edit) return;
      const key = edit.closest('.workout').dataset.id;

      if (!key) return;

      const element = data.find(workout => workout.id === key);

      const list = document.querySelector('.workout');
      list.insertAdjacentHTML('beforebegin', updateForm);

      // UPDATED FORM
      const save = document.querySelector('.update');
      const upInputType = document.querySelector('.update__input--type');
      const upInputDistance = document.querySelector(
        '.update__input--distance'
      );
      const upInputDuration = document.querySelector(
        '.update__input--duration'
      );
      const upInputCadence = document.querySelector('.update__input--cadence');
      const upInputElevation = document.querySelector(
        '.update__input--elevation'
      );

      const initUpdateForm = wk => {
        upInputType.value = wk.type;

        upInputDistance.value = wk.distance;

        upInputDuration.value = wk.duration;

        wk.type === 'running'
          ? (upInputCadence.value = wk.cadence)
          : (upInputElevation.value = wk.elevationGain);
      };

      const initialWorkoutData = wk => {
        const upType = upInputType.value;
        const upDistance = +upInputDistance.value;
        const upDuration = +upInputDuration.value;
        const upCadence = +upInputCadence.value;
        const upElevation = +upInputElevation.value;

        if (wk.type === 'running') {
          if (
            !validInput(upDistance, upDuration, upCadence) ||
            !checkPositive(upDistance, upDuration, upCadence)
          )
            return alert('Chech your input');

          return {
            cadence: upCadence,
            clicks: wk.clicks,
            coords: wk.coords,
            date: wk.date,
            description: wk.description,
            distance: upDistance,
            duration: upDuration,
            id: wk.id,
            pace: upDuration / upDistance,
            type: upType,
          };
        }

        if (wk.type === 'cycling') {
          if (
            !validInput(upDistance, upDuration, upCadence) ||
            !checkPositive(upDistance, upDuration)
          )
            return alert('Chech your input');

          return {
            elevationGain: upElevation,
            clicks: wk.clicks,
            coords: wk.coords,
            date: wk.date,
            description: wk.description,
            distance: upDistance,
            duration: upDuration,
            id: wk.id,
            speed: upDistance / (upDuration / 60),
            type: upType,
          };
        }
      };

      // ***** workout: running
      if (element.type === 'running') {
        // display input by workout type
        upInputCadence
          .closest('.form__row')
          .classList.remove('form__row--hidden');
        upInputElevation
          .closest('.form__row')
          .classList.add('form__row--hidden');

        // display item
        initUpdateForm(element);

        // Save the updating data
        save.addEventListener('submit', function (e) {
          e.preventDefault();

          const workout = initialWorkoutData(element);

          if (!workout) return;

          // Clear field
          upInputCadence.value =
            upInputDistance.value =
            upInputDuration.value =
            upInputElevation.value =
              '';

          // workout updated, send to localStorage
          console.log(element);
          console.log('Up running', workout);

          const el = data.filter(w => w.id !== element.id);
          localStorage.setItem('workouts', JSON.stringify([workout, ...el]));

          //JSON.parse(localStorage.getItem('workouts'));

          // hide form
          save.style.display = 'none';
          save.classList.add('hidden');
        });
      }

      // ***** workout: cycling
      if (element.type === 'cycling') {
        // display input by workout type
        upInputCadence.closest('.form__row').classList.add('form__row--hidden');

        upInputElevation
          .closest('.form__row')
          .classList.remove('form__row--hidden');

        // display item
        initUpdateForm(element);

        // Save the updating data
        save.addEventListener('submit', function (e) {
          e.preventDefault();

          const workout = initialWorkoutData(element);
          if (!workout) return;

          // Clear field
          upInputCadence.value =
            upInputDistance.value =
            upInputDuration.value =
            upInputElevation.value =
              '';

          // workout updated, send to localStorage
          console.log(element);
          console.log('Up cycling', workout);

          const el = data.filter(w => w.id !== element.id);
          localStorage.setItem('workouts', JSON.stringify([workout, ...el]));

          // hide form
          save.style.display = 'none';
          save.classList.add('hidden');
        });
      }
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload(); // reload the page;
  }
}

const app = new App();
// console.log(app.__proto__);
