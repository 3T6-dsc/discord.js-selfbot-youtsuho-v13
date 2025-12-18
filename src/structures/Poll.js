'use strict';

const { Collection } = require('@discordjs/collection');
const Base = require('./Base');
const { PollAnswer } = require('./PollAnswer');
const { Error } = require('../errors');
const { PollLayoutTypes } = require('../util/Constants');

/**
 * Represents a Poll
 * @extends {Base}
 */
class Poll extends Base {
  constructor(client, data, message) {
    super(client);

    /**
     * The message that started this poll
     * @name Poll#message
     * @type {Message}
     * @readonly
     */
    Object.defineProperty(this, 'message', { value: message });

    /**
     * The media for a poll's question
     * @type {PollQuestionMedia}
     */
    this.question = {
      text: data.question.text,
    };

    /**
     * The answers of this poll
     * @type {Collection<number, PollAnswer>}
     */
    this.answers = data.answers.reduce(
      (acc, answer) => acc.set(answer.answer_id, new PollAnswer(this.client, answer, this)),
      new Collection(),
    );

    /**
     * The timestamp when this poll expires
     * @type {number}
     */
    this.expiresTimestamp = Date.parse(data.expiry);

    /**
     * Whether this poll allows multiple answers
     * @type {boolean}
     */
    this.allowMultiselect = data.allow_multiselect;

    /**
     * The layout type of this poll
     * @type {PollLayoutType}
     */
    this.layoutType = PollLayoutTypes[data.layout_type] ?? 'DEFAULT';

    this._patch(data);
  }

  _patch(data) {
    if (data.results) {
      /**
       * Whether this poll's results have been precisely counted
       * @type {boolean}
       */
      this.resultsFinalized = data.results.is_finalized;

      for (const answerResult of data.results.answer_counts) {
        const answer = this.answers.get(answerResult.id);
        answer?._patch(answerResult);
      }
    } else {
      this.resultsFinalized ??= false;
    }
  }

  /**
   * Whether the poll is currently active.
   * @type {boolean}
   * @readonly
   */
  get active() {
    return Date.now() < this.expiresTimestamp;
  }

  /**
   * The date when this poll expires
   * @type {Date}
   * @readonly
   */
  get expiresAt() {
    return new Date(this.expiresTimestamp);
  }

  /**
   * Ends this poll immediately.
   * @returns {Promise<Message>}
   */
  async end() {
    if (Date.now() > this.expiresTimestamp) {
      throw new Error('POLL_ALREADY_EXPIRED');
    }
    return this.message.channel.messages.endPoll(this.message.id);
  }

  /**
   * Fetches the users that voted for a specific answer.
   * @param {number} answerId The ID of the answer
   * @param {BaseFetchPollAnswerVotersOptions} [options] Options for fetching voters
   * @returns {Promise<Collection<Snowflake, User>>}
   */
  fetchVoters(answerId, options) {
    return this.message.channel.messages.fetchPollAnswerVoters({
      messageId: this.message.id,
      answerId,
      ...options,
    });
  }
}

module.exports = { Poll };