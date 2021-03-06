/**
 * @license
 * Copyright The Fitts-Expeiment-WebApp Authors. All Rights Reserved.
 *
 * Use of this source code is governed by the Apache2 license that can be
 * found in the LICENSE file
 */

import * as experiment from './experiment';
import * as trial_parameters from './trial_parameters';

import * as charts from './charts';

import 'pixi.js';

const STORAGE_KEY_PARAMS = 'params';
const STORAGE_KEY_LOGS = 'logs';
// DOM element shown before a trial starts.
const DOM_ID_PRETRIAL = 'pre-trial';
// DOM element shown during a trial.
const DOM_ID_TRIAL = 'trial';
const DOM_ID_LOGS = 'logs';
const DOM_ID_GRAPHS = 'graphs';
const DOM_ID_INFO = 'info';

export class App {
  private trialParamsEl: HTMLTextAreaElement =
    (document.getElementById('trial-params') as any);

  private domInfoEl: HTMLElement = document.getElementById(DOM_ID_INFO);

  public data: {
      currentTrial?: experiment.Trial
    } = {};

  constructor() {
    console.log('loading!');
    let logsLoadedFromStorage = localStorage.getItem(STORAGE_KEY_LOGS);
    if (logsLoadedFromStorage != null) {
      experiment.setLogs(JSON.parse(logsLoadedFromStorage));
    }

    // Initialize params
    let trial_params_string = localStorage.getItem(STORAGE_KEY_PARAMS);
    let trial_params: trial_parameters.Params;
    if(!trial_params_string) {
      trial_params = JSON.parse(JSON.stringify(trial_parameters.default_params));
    } else {
      trial_params = JSON.parse(trial_params_string);
    }
    this.trialParamsEl.value = JSON.stringify(trial_params, null, 2);

    this.removeInfoStuff();
  }

  removeInfoStuff() {
    let elements = this.domInfoEl.children;
    while(elements.length > 0) {
      this.domInfoEl.removeChild(this.domInfoEl.children[0]);
    }
  }


  addGraphForTrial(parentEl: HTMLElement, trial: experiment.TrialLog) {
    let data_dx = trial.events.map((e:experiment.EventLog) => {
      return { x: e.timestamp - trial.start_timestamp,
               y: e.dx }
    });
    let data_dy = trial.events.map((e:experiment.EventLog) => {
      return { x: e.timestamp - trial.start_timestamp,
               y: e.dy }
    });
    let data_d = trial.events.map((e:experiment.EventLog) => {
      return { x: e.timestamp - trial.start_timestamp,
               y: Math.sqrt(Math.pow(e.dx, 2) + Math.pow(e.dy, 2)) }
    });
    new charts.Chart(
      400, 200,
      { 'dx': { data: data_dx, fill: 'rgba(255, 0, 0, 0.5)', },
        'dy': { data: data_dy, fill: 'rgba(0, 255, 0, 0.5)', },
        'd': { data: data_d, fill: 'rgba(0, 0, 255, 0.5)', },
      },
      parentEl,
      { bounds: { x_min: 0,
                  x_max: (trial.end_timestamp - trial.start_timestamp),
                }
      });
  }

  showGraphsForTrials() {
    this.removeInfoStuff();

    let summaryGraphEl = document.createElement('div');
    summaryGraphEl.setAttribute('class', 'summary');
    this.domInfoEl.appendChild(summaryGraphEl);

    let summaryTextEl = document.createElement('p');
    summaryTextEl.setAttribute('class', 'summary-text');
    summaryTextEl.textContent = 'Summary graph:';
    summaryGraphEl.appendChild(summaryTextEl);

    let d_t_avg_data : { x:number; y:number; }[] = [];
    let dx_t_avg_data : { x:number; y:number; }[] = [];
    let dy_t_avg_data : { x:number; y:number; }[] = [];

    let graphsEl = document.createElement('div');
    graphsEl.setAttribute('id', DOM_ID_GRAPHS);
    this.domInfoEl.appendChild(graphsEl);


    for(let trial of experiment.logs) {
      let graphEl = document.createElement('div');
      graphsEl.appendChild(graphEl);

      let textEl = document.createElement('p');
      textEl.setAttribute('class', 'graph-text');
      textEl.textContent = 'Trial ' + trial.trialId + ':';
      graphsEl.appendChild(textEl);

      this.addGraphForTrial(graphsEl, trial);

      d_t_avg_data.push(
          { x: experiment.trialAverageTimeToTap(trial),
            y: experiment.trialAverageDistanceToCenter(trial), });
      dx_t_avg_data.push(
          { x: experiment.trialAverageTimeToTap(trial),
            y: experiment.trialAverageDxToCenter(trial), });
      dy_t_avg_data.push(
          { x: experiment.trialAverageTimeToTap(trial),
            y: experiment.trialAverageDyToCenter(trial), });
    }

    new charts.Chart(
      400, 200,
      { 'dx': { data: dx_t_avg_data, fill: 'rgba(255, 0, 0, 0.5)', },
        'dy': { data: dy_t_avg_data, fill: 'rgba(0, 255, 0, 0.5)', },
        'd': { data: d_t_avg_data, fill: 'rgba(0, 0, 255, 0.5)', },
      },
      summaryGraphEl);
  }

  startTrial() {
    console.log('starting new trial.');
    this.removeInfoStuff();

    let trial_params = JSON.parse(this.trialParamsEl.value);
    localStorage.setItem(STORAGE_KEY_PARAMS, JSON.stringify(trial_params));

    let preTrialElement = document.getElementById(DOM_ID_PRETRIAL);
    let trialElement = document.getElementById(DOM_ID_TRIAL);
    preTrialElement.hidden = true;
    trialElement.hidden = false;
    this.data.currentTrial = new experiment.Trial(trial_params);
    trialElement.appendChild(this.data.currentTrial.domElement);

    this.data.currentTrial.onceDone.then(() => {
      preTrialElement.hidden = false;
      trialElement.hidden = true;
      trialElement.removeChild(this.data.currentTrial.domElement);
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(experiment.logs));
    });
  }

  showLogs() {
    this.removeInfoStuff();

    let data = new Blob([experiment.textOfLogs()]);
    let url = URL.createObjectURL(data);

    let downloadEl = document.createElement('a');
    downloadEl.setAttribute('download', 'logs.csv');
    downloadEl.setAttribute('type', 'text/csv');
    downloadEl.setAttribute('href', url);
    downloadEl.innerText = 'Download logs';
    this.domInfoEl.appendChild(downloadEl);

    let logsEl = document.createElement('div');
    logsEl.setAttribute('id', DOM_ID_LOGS);
    this.domInfoEl.appendChild(logsEl);
    logsEl.textContent = experiment.textOfLogs();
  }

  resetToDefaultParams() {
    let trial_params = JSON.parse(this.trialParamsEl.value);
    trial_params = JSON.parse(JSON.stringify(trial_parameters.default_params));
    this.trialParamsEl.value = JSON.stringify(trial_params, null, 2);
  }

  clearLogs() {
    experiment.clearLogs();
    localStorage.clear();
    this.removeInfoStuff();
  }

}
